import { IconButton, ListItem, ListItemAvatar, ListItemText, styled } from "@mui/material";
import { bindPopover } from "material-ui-popup-state";
import { bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import * as React from "react";
import { forwardRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DefaultButton } from "../../../Common/StyledComponents.tsx";
import CaretDown from "../../../Icons/CaretDown.tsx";
import Dismiss from "../../../Icons/Dismiss.tsx";
import { Option } from "./AudienceSearch.tsx";
import OptionIcon from "./OptionIcon.tsx";
import { PermissionBools, PermissionListItem } from "./PermissionList.tsx";
import PermissionSettingPopover, { PermissionKey } from "./PermissionSettingPopover.tsx";

export interface PermissionSettingItemProps {
  item: PermissionListItem;
  onOptionRemoved: (option: Option) => void;
  onOptChange: (option: PermissionListItem) => void;
  readOnly?: boolean;
}

const PermissionDropButton = styled(DefaultButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  minWidth: 0,
  minHeight: 0,
  borderRadius: "4px",
  padding: "0px 4px",
}));

export const usePermissionSummary = (item: PermissionBools) => {
  const { t } = useTranslation();
  const permissionSummary = useMemo(() => {
    const permission = item;
    const summary: string[] = [];
    if (permission.read) {
      summary.push(t("application:modals.read"));
    } else if (permission.list) {
      summary.push(t("application:modals.list"));
    }
    if (permission.create) {
      summary.push(t("application:modals.create"));
    }
    if (permission.update) {
      summary.push(t("application:modals.update"));
    }
    if (permission.delete) {
      summary.push(t("application:modals.delete"));
    }
    if (permission.share) {
      summary.push(t("application:modals.shareManagement"));
    }

    if (summary.length === 0) {
      return t("application:modals.noAccess");
    }
    return summary.join(" · ");
  }, [item, t]);

  return permissionSummary;
};

const PermissionSettingItem = forwardRef(
  ({ item, onOptionRemoved, onOptChange, readOnly }: PermissionSettingItemProps, ref: React.Ref<HTMLLIElement>) => {
    const { t } = useTranslation();

    const permissionSettingPopup = usePopupState({
      variant: "popover",
      popupId: "permissionSetting",
    });

    const permissionSummary = usePermissionSummary(item.permission);
    const onChange = useCallback(
      (item: PermissionListItem, key: PermissionKey, value: boolean) => {
        const newItem = { ...item, permission: { ...item.permission } };
        newItem.permission[key] = value;

        // enforce permission dependency
        switch (key) {
          case "list":
            if (!value) {
              newItem.permission.read = false;
              newItem.permission.update = false;
              newItem.permission.create = false;
              newItem.permission.delete = false;
              newItem.permission.share = false;
            }
            break;
          case "read":
            if (value) {
              newItem.permission.list = true;
            } else {
              newItem.permission.update = false;
              newItem.permission.create = false;
              newItem.permission.delete = false;
              newItem.permission.share = false;
            }
            break;
          case "update":
            if (value) {
              newItem.permission.read = true;
              newItem.permission.list = true;
            } else {
              newItem.permission.delete = false;
              newItem.permission.share = false;
            }
            break;
          case "create":
            if (value) {
              newItem.permission.read = true;
              newItem.permission.list = true;
            } else {
              newItem.permission.share = false;
            }
            break;
          case "delete":
            if (value) {
              newItem.permission.read = true;
              newItem.permission.update = true;
              newItem.permission.list = true;
            } else {
              newItem.permission.share = false;
            }
            break;
          case "share":
            if (value) {
              newItem.permission.read = true;
              newItem.permission.update = true;
              newItem.permission.create = true;
              newItem.permission.delete = true;
              newItem.permission.list = true;
            }
            break;
        }

        onOptChange(newItem);
      },
      [onOptChange],
    );

    return (
      <ListItem ref={ref} disablePadding>
        <ListItemAvatar sx={{ minWidth: "52px" }}>
          <OptionIcon option={item.option} />
        </ListItemAvatar>
        <ListItemText
          primary={item.option.name}
          secondary={
            <PermissionDropButton
              size={"small"}
              {...bindTrigger(permissionSettingPopup)}
              endIcon={<CaretDown sx={{ fontSize: "12px!important" }} />}
            >
              {permissionSummary}
            </PermissionDropButton>
          }
          slotProps={{
            primary: {
              noWrap: true,
              sx: {
                textOverflow: "ellipsis",
                overflow: "hidden",
                marginLeft: "4px",
              },
            },
          }}
        />
        {!readOnly && !item.disableRemove && (
          <IconButton
            sx={{ margin: "0 8px 0 16px" }}
            size="small"
            edge="end"
            aria-label="delete"
            onClick={() => onOptionRemoved(item.option)}
          >
            <Dismiss fontSize="small" />
          </IconButton>
        )}
        <PermissionSettingPopover
          readOnly={readOnly}
          onPermChange={onChange}
          item={item}
          {...bindPopover(permissionSettingPopup)}
        />
      </ListItem>
    );
  },
);

export default PermissionSettingItem;
