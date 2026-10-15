package dbfs

import (
	"strconv"

	"github.com/cloudreve/Cloudreve/v4/ent"
	"github.com/cloudreve/Cloudreve/v4/inventory"
	"github.com/cloudreve/Cloudreve/v4/inventory/types"
	"github.com/cloudreve/Cloudreve/v4/pkg/boolset"
	"github.com/cloudreve/Cloudreve/v4/pkg/hashid"
)

// DefaultSharePermission returns the default base64 encoded permission (read + list).
func DefaultSharePermission() string {
	bs := &boolset.BooleanSet{}
	boolset.Set(types.FilePermissionRead, true, bs)
	boolset.Set(types.FilePermissionList, true, bs)
	s, _ := bs.String()
	return s
}

// FullSharePermission returns full permission (read, update, create, delete, share, list).
func FullSharePermission() string {
	bs := &boolset.BooleanSet{}
	boolset.Set(types.FilePermissionRead, true, bs)
	boolset.Set(types.FilePermissionUpdate, true, bs)
	boolset.Set(types.FilePermissionCreate, true, bs)
	boolset.Set(types.FilePermissionDelete, true, bs)
	boolset.Set(types.FilePermissionShare, true, bs)
	boolset.Set(types.FilePermissionList, true, bs)
	s, _ := bs.String()
	return s
}

// EvaluateSharePermission calculates the effective FilePermission base64 string for a given requester on a share.
func EvaluateSharePermission(setting *types.PermissionSettingReq, requester *ent.User, owner *ent.User, encoder hashid.Encoder) string {
	// If requester is owner, or is admin, grant full permissions
	if requester != nil && owner != nil && requester.ID == owner.ID {
		return FullSharePermission()
	}
	if requester != nil && requester.Edges.Group != nil && requester.Edges.Group.Permissions.Enabled(int(types.GroupPermissionIsAdmin)) {
		return FullSharePermission()
	}

	if setting == nil {
		return DefaultSharePermission()
	}

	// 1. Anonymous requester
	if requester == nil || inventory.IsAnonymousUser(requester) {
		if setting.Anonymous != "" {
			return setting.Anonymous
		}
		return DefaultSharePermission()
	}

	// 2. User-explicit
	uidStr := strconv.Itoa(requester.ID)
	var encodedUID string
	if encoder != nil {
		encodedUID = hashid.EncodeUserID(encoder, requester.ID)
	}
	if setting.UserExplicit != nil {
		if perm, ok := setting.UserExplicit[uidStr]; ok && perm != "" {
			return perm
		}
		if encodedUID != "" {
			if perm, ok := setting.UserExplicit[encodedUID]; ok && perm != "" {
				return perm
			}
		}
	}

	// 3. Group-explicit
	if requester.Edges.Group != nil && setting.GroupExplicit != nil {
		gidStr := strconv.Itoa(requester.Edges.Group.ID)
		var encodedGID string
		if encoder != nil {
			encodedGID = hashid.EncodeGroupID(encoder, requester.Edges.Group.ID)
		}
		if perm, ok := setting.GroupExplicit[gidStr]; ok && perm != "" {
			return perm
		}
		if encodedGID != "" {
			if perm, ok := setting.GroupExplicit[encodedGID]; ok && perm != "" {
				return perm
			}
		}
	}

	// 4. Same group
	if requester.Edges.Group != nil && owner != nil && owner.Edges.Group != nil && requester.Edges.Group.ID == owner.Edges.Group.ID {
		if setting.SameGroup != "" {
			return setting.SameGroup
		}
	}

	// 5. Everyone
	if setting.Everyone != "" {
		return setting.Everyone
	}

	// 6. Other
	if setting.Other != "" {
		return setting.Other
	}

	// 7. Fallback to Anonymous setting or default
	if setting.Anonymous != "" {
		return setting.Anonymous
	}

	return DefaultSharePermission()
}
