package explorer

import (
	"github.com/cloudreve/Cloudreve/v4/application/dependency"
	"github.com/cloudreve/Cloudreve/v4/inventory"
	"github.com/cloudreve/Cloudreve/v4/inventory/types"
	"github.com/cloudreve/Cloudreve/v4/pkg/filemanager/fs"
	"github.com/cloudreve/Cloudreve/v4/pkg/filemanager/manager"
	"github.com/cloudreve/Cloudreve/v4/pkg/serializer"
	"github.com/gin-gonic/gin"
)

type (
	SetPermissionService struct {
		Uris    []string                    `json:"uris" binding:"required"`
		Setting *types.PermissionSettingReq `json:"setting" binding:"required"`
	}
	SetPermissionParamCtx struct{}

	ClearPermissionService struct {
		Uris []string `json:"uris" binding:"required"`
	}
	ClearPermissionParamCtx struct{}
)

func (s *SetPermissionService) GetUris() []string {
	return s.Uris
}

func (s *ClearPermissionService) GetUris() []string {
	return s.Uris
}

func (s *SetPermissionService) Set(c *gin.Context) error {
	dep := dependency.FromContext(c)
	user := inventory.UserFromContext(c)
	m := manager.NewFileManager(dep, user)
	defer m.Recycle()

	uris, err := fs.NewUriFromStrings(s.Uris...)
	if err != nil {
		return serializer.NewError(serializer.CodeParamErr, "unknown uri", err)
	}

	for _, uri := range uris {
		if err := m.PatchPermission(c, uri, s.Setting); err != nil {
			return err
		}
	}

	return nil
}

func (s *ClearPermissionService) Clear(c *gin.Context) error {
	dep := dependency.FromContext(c)
	user := inventory.UserFromContext(c)
	m := manager.NewFileManager(dep, user)
	defer m.Recycle()

	uris, err := fs.NewUriFromStrings(s.Uris...)
	if err != nil {
		return serializer.NewError(serializer.CodeParamErr, "unknown uri", err)
	}

	for _, uri := range uris {
		if err := m.PatchPermission(c, uri, nil); err != nil {
			return err
		}
	}

	return nil
}
