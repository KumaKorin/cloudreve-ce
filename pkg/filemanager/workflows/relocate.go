package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"sync/atomic"

	"github.com/cloudreve/Cloudreve/v4/application/dependency"
	"github.com/cloudreve/Cloudreve/v4/ent"
	"github.com/cloudreve/Cloudreve/v4/ent/task"
	"github.com/cloudreve/Cloudreve/v4/inventory"
	"github.com/cloudreve/Cloudreve/v4/inventory/types"
	"github.com/cloudreve/Cloudreve/v4/pkg/filemanager/fs"
	"github.com/cloudreve/Cloudreve/v4/pkg/filemanager/fs/dbfs"
	"github.com/cloudreve/Cloudreve/v4/pkg/filemanager/manager"
	"github.com/cloudreve/Cloudreve/v4/pkg/hashid"
	"github.com/cloudreve/Cloudreve/v4/pkg/logging"
	"github.com/cloudreve/Cloudreve/v4/pkg/queue"
	"golang.org/x/tools/container/intsets"
)

type (
	RelocateTask struct {
		*queue.DBTask

		l        logging.Logger
		state    *RelocateTaskState
		progress queue.Progresses
	}
	RelocateTaskPhase string
	RelocateTaskState struct {
		Uris         []string          `json:"uris"`
		DstPolicyID  int               `json:"dst_policy_id"`
		Phase        RelocateTaskPhase `json:"phase"`
		Entities     []int             `json:"entities,omitempty"`
		EntityUris   map[int]string    `json:"entity_uris,omitempty"`
		Folders      []int             `json:"folders,omitempty"`
		CurrentIndex int               `json:"current_index,omitempty"`
		Failed       int               `json:"failed,omitempty"`
	}
)

const (
	RelocateTaskPhaseIndexing RelocateTaskPhase = ""
	RelocateTaskPhaseTransfer RelocateTaskPhase = "transfer"
	RelocateTaskPhaseFinish   RelocateTaskPhase = "finish"
)

func init() {
	queue.RegisterResumableTaskFactory(queue.RelocateTaskType, NewRelocateTaskFromModel)
}

func NewRelocateTask(ctx context.Context, u *ent.User, uris []string, dstPolicyID int) (queue.Task, error) {
	state := &RelocateTaskState{
		Uris:        uris,
		DstPolicyID: dstPolicyID,
		Phase:       RelocateTaskPhaseIndexing,
		EntityUris:  make(map[int]string),
	}
	stateBytes, err := json.Marshal(state)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal state: %w", err)
	}

	return &RelocateTask{
		DBTask: &queue.DBTask{
			Task: &ent.Task{
				Type:          queue.RelocateTaskType,
				CorrelationID: logging.CorrelationID(ctx),
				PrivateState:  string(stateBytes),
				PublicState:   &types.TaskPublicState{},
			},
			DirectOwner: u,
		},
	}, nil
}

func NewRelocateTaskFromModel(t *ent.Task) queue.Task {
	return &RelocateTask{
		DBTask: &queue.DBTask{
			Task: t,
		},
	}
}

func (m *RelocateTask) Do(ctx context.Context) (task.Status, error) {
	dep := dependency.FromContext(ctx)
	m.l = dep.Logger()

	m.Lock()
	if m.progress == nil {
		m.progress = make(queue.Progresses)
	}
	m.Unlock()

	state := &RelocateTaskState{}
	if err := json.Unmarshal([]byte(m.State()), state); err != nil {
		return task.StatusError, fmt.Errorf("failed to unmarshal state: %w", err)
	}
	if state.EntityUris == nil {
		state.EntityUris = make(map[int]string)
	}
	m.state = state

	var (
		next task.Status
		err  error
	)
	switch m.state.Phase {
	case RelocateTaskPhaseIndexing:
		next, err = m.indexing(ctx, dep)
	case RelocateTaskPhaseTransfer:
		next, err = m.transfer(ctx, dep)
	case RelocateTaskPhaseFinish:
		next, err = m.finish(ctx, dep)
	default:
		return task.StatusError, fmt.Errorf("unknown relocate phase: %s", m.state.Phase)
	}

	newStateStr, marshalErr := json.Marshal(m.state)
	if marshalErr != nil {
		return task.StatusError, fmt.Errorf("failed to marshal state: %w", marshalErr)
	}

	m.Lock()
	m.Task.PrivateState = string(newStateStr)
	m.Unlock()

	return next, err
}

func (m *RelocateTask) indexing(ctx context.Context, dep dependency.Dep) (task.Status, error) {
	user := inventory.UserFromContext(ctx)
	fm := manager.NewFileManager(dep, user)
	defer fm.Recycle()

	entitySet := make(map[int]bool)
	var entities []int
	var folders []int

	for _, uriStr := range m.state.Uris {
		uri, err := fs.NewUriFromString(uriStr)
		if err != nil {
			m.l.Warning("Failed to parse uri %q: %s, skipping", uriStr, err)
			continue
		}

		file, err := fm.Get(ctx, uri, dbfs.WithFileEntities())
		if err != nil {
			m.l.Warning("Failed to get file %s: %s, skipping", uri, err)
			continue
		}

		if file.Type() == types.FileTypeFile {
			for _, e := range file.Entities() {
				if e.PolicyID() != m.state.DstPolicyID && !entitySet[e.ID()] {
					entitySet[e.ID()] = true
					entities = append(entities, e.ID())
					m.state.EntityUris[e.ID()] = uriStr
				}
			}
		} else if file.Type() == types.FileTypeFolder {
			folders = append(folders, file.ID())
			err = fm.Walk(ctx, uri, intsets.MaxInt, func(f fs.File, level int) error {
				if f.Type() == types.FileTypeFolder {
					folders = append(folders, f.ID())
				} else if f.Type() == types.FileTypeFile {
					for _, e := range f.Entities() {
						if e.PolicyID() != m.state.DstPolicyID && !entitySet[e.ID()] {
							entitySet[e.ID()] = true
							entities = append(entities, e.ID())
							m.state.EntityUris[e.ID()] = f.Uri(false).String()
						}
					}
				}
				return nil
			}, dbfs.WithFileEntities())
			if err != nil {
				m.l.Warning("Failed to walk folder %s: %s", uri, err)
			}
		}
	}

	m.state.Entities = entities
	m.state.Folders = folders
	m.state.CurrentIndex = 0
	m.state.Phase = RelocateTaskPhaseTransfer

	m.Lock()
	m.progress[ProgressTypeRelocateTransferCount] = &queue.Progress{
		Total:   int64(len(entities)),
		Current: 0,
	}
	m.Unlock()

	m.ResumeAfter(0)
	return task.StatusSuspending, nil
}

func (m *RelocateTask) transfer(ctx context.Context, dep dependency.Dep) (task.Status, error) {
	totalEntities := len(m.state.Entities)
	if totalEntities == 0 || m.state.CurrentIndex >= totalEntities {
		m.state.Phase = RelocateTaskPhaseFinish
		m.ResumeAfter(0)
		return task.StatusSuspending, nil
	}

	user := inventory.UserFromContext(ctx)
	fm := manager.NewFileManager(dep, user)
	defer fm.Recycle()

	dstPolicy, err := dep.StoragePolicyClient().GetPolicyByID(ctx, m.state.DstPolicyID)
	if err != nil {
		return task.StatusError, fmt.Errorf("failed to get destination storage policy [%d]: %w", m.state.DstPolicyID, err)
	}

	dstDriver, err := fm.GetStorageDriver(ctx, dstPolicy)
	if err != nil {
		return task.StatusError, fmt.Errorf("failed to get driver for destination policy [%d]: %w", m.state.DstPolicyID, err)
	}

	m.Lock()
	if m.progress[ProgressTypeRelocateTransferCount] == nil {
		m.progress[ProgressTypeRelocateTransferCount] = &queue.Progress{
			Total:   int64(totalEntities),
			Current: int64(m.state.CurrentIndex),
		}
	}
	m.Unlock()

	for m.state.CurrentIndex < totalEntities {
		entityID := m.state.Entities[m.state.CurrentIndex]

		entModel, err := dep.FileClient().GetEntityByID(ctx, entityID)
		if err != nil {
			m.l.Warning("Failed to get entity [%d]: %s, skipping", entityID, err)
			m.state.Failed++
			m.state.CurrentIndex++
			atomic.AddInt64(&m.progress[ProgressTypeRelocateTransferCount].Current, 1)
			continue
		}

		if entModel.StoragePolicyEntities == m.state.DstPolicyID {
			m.state.CurrentIndex++
			atomic.AddInt64(&m.progress[ProgressTypeRelocateTransferCount].Current, 1)
			continue
		}

		oldSourcePath := entModel.Source
		oldPolicyID := entModel.StoragePolicyEntities

		source, err := fm.GetEntitySource(ctx, entityID)
		if err != nil {
			m.l.Warning("Failed to get entity source [%d]: %s, skipping", entityID, err)
			m.state.Failed++
			m.state.CurrentIndex++
			atomic.AddInt64(&m.progress[ProgressTypeRelocateTransferCount].Current, 1)
			continue
		}

		uriStr := m.state.EntityUris[entityID]
		fileUri, err := fs.NewUriFromString(uriStr)
		if err != nil {
			fileUri, _ = fs.NewUriFromString("my://")
		}

		uploadReq := &fs.UploadRequest{
			File:   source,
			Seeker: source,
			Props: &fs.UploadProps{
				Uri:      fileUri,
				Size:     entModel.Size,
				MimeType: dep.MimeDetector(ctx).TypeByName(fileUri.Name()),
			},
		}

		newSavePath := dbfs.GenerateSavePath(dstPolicy, uploadReq, user)
		uploadReq.Props.SavePath = newSavePath

		err = dstDriver.Put(ctx, uploadReq)
		_ = source.Close()
		if err != nil {
			m.l.Error("Failed to put entity [%d] to new destination: %s", entityID, err)
			m.state.Failed++
			m.state.CurrentIndex++
			atomic.AddInt64(&m.progress[ProgressTypeRelocateTransferCount].Current, 1)
			continue
		}

		_, err = dep.DBClient().Entity.UpdateOneID(entityID).
			SetStoragePolicyEntities(m.state.DstPolicyID).
			SetSource(newSavePath).
			Save(ctx)
		if err != nil {
			m.l.Error("Failed to update entity [%d] in database: %s", entityID, err)
			m.state.Failed++
			_, _ = dstDriver.Delete(ctx, newSavePath)
			m.state.CurrentIndex++
			atomic.AddInt64(&m.progress[ProgressTypeRelocateTransferCount].Current, 1)
			continue
		}

		// Delete old physical object
		oldPolicy, err := dep.StoragePolicyClient().GetPolicyByID(ctx, oldPolicyID)
		if err == nil {
			oldDriver, err := fm.GetStorageDriver(ctx, oldPolicy)
			if err == nil {
				_, _ = oldDriver.Delete(ctx, oldSourcePath)
			}
		}

		m.state.CurrentIndex++
		atomic.AddInt64(&m.progress[ProgressTypeRelocateTransferCount].Current, 1)
	}

	m.state.Phase = RelocateTaskPhaseFinish
	m.ResumeAfter(0)
	return task.StatusSuspending, nil
}

func (m *RelocateTask) finish(ctx context.Context, dep dependency.Dep) (task.Status, error) {
	for _, folderID := range m.state.Folders {
		_, err := dep.DBClient().File.UpdateOneID(folderID).
			SetStoragePolicyFiles(m.state.DstPolicyID).
			Save(ctx)
		if err != nil {
			m.l.Warning("Failed to update folder [%d] storage policy: %s", folderID, err)
		}
	}

	return task.StatusCompleted, nil
}

func (m *RelocateTask) Progress(ctx context.Context) queue.Progresses {
	m.Lock()
	defer m.Unlock()
	return m.progress
}

func (m *RelocateTask) Summarize(hasher hashid.Encoder) *queue.Summary {
	if m.state == nil {
		if err := json.Unmarshal([]byte(m.State()), &m.state); err != nil {
			return nil
		}
	}

	return &queue.Summary{
		Phase: string(m.state.Phase),
		Props: map[string]any{
			SummaryKeySrcMultiple:    m.state.Uris,
			SummaryKeySrcDstPolicyID: hashid.EncodePolicyID(hasher, m.state.DstPolicyID),
			SummaryKeyFailed:         m.state.Failed,
			SummaryKeyTotal:          len(m.state.Entities),
		},
	}
}
