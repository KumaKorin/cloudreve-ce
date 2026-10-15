package user

import (
	"github.com/cloudreve/Cloudreve/v4/application/dependency"
	"github.com/cloudreve/Cloudreve/v4/pkg/serializer"
	"github.com/gin-gonic/gin"
)

type GroupListService struct{}

func (s *GroupListService) List(c *gin.Context) ([]*Group, error) {
	dep := dependency.FromContext(c)
	groups, err := dep.GroupClient().ListAll(c)
	if err != nil {
		return nil, serializer.NewError(serializer.CodeDBError, "Failed to list groups", err)
	}

	encoder := dep.HashIDEncoder()
	res := make([]*Group, 0, len(groups))
	for _, g := range groups {
		res = append(res, BuildGroup(g, encoder))
	}
	return res, nil
}
