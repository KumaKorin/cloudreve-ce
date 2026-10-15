import { alpha, Box, ButtonBase, Checkbox, Popover, PopoverProps, styled, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Add from "../../../Icons/Add.tsx";
import AppsListOutlined from "../../../Icons/AppsListOutlined.tsx";
import DeleteOutlined from "../../../Icons/DeleteOutlined.tsx";
import Edit from "../../../Icons/Edit.tsx";
import Eye from "../../../Icons/Eye.tsx";
import Share from "../../../Icons/Share.tsx";
import { PermissionListItem } from "./PermissionList.tsx";

export interface PermissionSettingPopoverProps extends PopoverProps {
  item: PermissionListItem;
  onPermChange?: (item: PermissionListItem, key: PermissionKey, value: boolean) => void;
  readOnly?: boolean;
}

export type PermissionKey = "list" | "read" | "create" | "update" | "delete" | "share";

interface PermMeta {
  key: PermissionKey;
  label: string;
  description: string;
  Icon: React.ElementType;
}

const permissionGroups: { title: string; items: PermMeta[] }[] = [
  {
    title: "application:modals.permGroupRead",
    items: [
      {
        key: "list",
        label: "application:modals.list",
        description: "application:modals.listDes",
        Icon: AppsListOutlined,
      },
      { key: "read", label: "application:modals.read", description: "application:modals.readDes", Icon: Eye },
    ],
  },
  {
    title: "application:modals.permGroupMutations",
    items: [
      { key: "create", label: "application:modals.create", description: "application:modals.createDes", Icon: Add },
      { key: "update", label: "application:modals.update", description: "application:modals.updateDes", Icon: Edit },
      {
        key: "delete",
        label: "application:modals.delete",
        description: "application:modals.deleteDes",
        Icon: DeleteOutlined,
      },
    ],
  },
  {
    title: "application:modals.permGroupAdvanced",
    items: [
      {
        key: "share",
        label: "application:modals.shareManagement",
        description: "application:modals.shareManagementDes",
        Icon: Share,
      },
    ],
  },
];

const PermBox = styled(ButtonBase, { shouldForwardProp: (prop) => prop !== "selected" })<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    width: "100%",
    textAlign: "left",
    padding: theme.spacing(1.25, 1.5),
    borderRadius: theme.spacing(1.25),
    backgroundColor: selected
      ? alpha(theme.palette.primary.main, 0.12)
      : theme.palette.mode === "light"
        ? alpha(theme.palette.text.primary, 0.04)
        : alpha(theme.palette.common.white, 0.06),
    transition: theme.transitions.create(["background-color"], {
      duration: theme.transitions.duration.shortest,
    }),
    "&:hover:not(.Mui-disabled)": {
      backgroundColor: selected
        ? alpha(theme.palette.primary.main, 0.18)
        : theme.palette.mode === "light"
          ? alpha(theme.palette.text.primary, 0.08)
          : alpha(theme.palette.common.white, 0.1),
    },
    "&.Mui-disabled": {
      opacity: 0.45,
    },
  }),
);

const PermissionSettingPopover = ({ item, onPermChange, readOnly, ...rest }: PermissionSettingPopoverProps) => {
  const { t } = useTranslation();
  const handleToggle = (key: PermissionKey) => () => {
    if (onPermChange) {
      onPermChange(item, key, !item.permission[key]);
    }
  };

  return (
    <Popover
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      {...rest}
    >
      <Box sx={{ p: 1.5, width: 340, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {permissionGroups.map((group) => (
          <Box key={group.title}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.75, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}
            >
              {t(group.title)}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {group.items.map((meta) => {
                const checked = !!item.permission[meta.key];
                const disabled =
                  readOnly ||
                  (item.disableSetHigherPerm && meta.key !== "read" && meta.key !== "list") ||
                  (item.disableShare && meta.key === "share");
                const Icon = meta.Icon;
                return (
                  <PermBox key={meta.key} selected={checked} disabled={disabled} onClick={handleToggle(meta.key)}>
                    <Box
                      sx={{
                        display: "flex",
                        mt: 0.25,
                        color: checked ? "primary.main" : "text.secondary",
                      }}
                    >
                      <Icon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t(meta.label)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
                        {t(meta.description)}
                      </Typography>
                    </Box>
                    <Checkbox
                      checked={checked}
                      size="small"
                      tabIndex={-1}
                      disableRipple
                      sx={{ p: 0, mt: 0.25, pointerEvents: "none" }}
                    />
                  </PermBox>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Popover>
  );
};

export default PermissionSettingPopover;
