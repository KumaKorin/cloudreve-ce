import { Box, Collapse, List, Stack, Typography } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { TransitionGroup } from "react-transition-group";
import { FilePermission, PermissionSettingReq } from "../../../../api/explorer.ts";
import Boolset from "../../../../util/boolset.ts";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar.tsx";
import AudienceSearch, { builtinCollectionID, Option } from "./AudienceSearch.tsx";
import { builtinGroup, groupsGroup, usersGroup } from "./OptionIcon.tsx";
import PermissionSettingItem from "./PermissionSettingItem.tsx";

export interface PermissionListProps {
  list: PermissionListItem[];
  onChange?: (f: (prev: PermissionListItem[]) => PermissionListItem[]) => void;
}

export interface PermissionListItem {
  option: Option;
  permission: PermissionBools;
  disableRemove?: boolean;
  disableShare?: boolean;
  disableSetHigherPerm?: boolean;
}

export interface PermissionBools {
  list: boolean;
  read: boolean;
  update: boolean;
  create: boolean;
  delete: boolean;
  share: boolean;
}

const permissionBoolToString = (p: PermissionBools): string => {
  const bs = new Boolset();
  bs.sets({
    [FilePermission.list]: p.list,
    [FilePermission.read]: p.read,
    [FilePermission.update]: p.update,
    [FilePermission.create]: p.create,
    [FilePermission.delete]: p.delete,
    [FilePermission.share]: p.share,
  });

  return bs.toString();
};

export const PermissionListToParams = (list: PermissionListItem[]): PermissionSettingReq => {
  const res: PermissionSettingReq = {};
  list.forEach((item) => {
    switch (item.option.group) {
      case builtinGroup:
        switch (item.option.id) {
          case builtinCollectionID.everyone:
            res.everyone = permissionBoolToString(item.permission);
            break;
          case "same_group":
            res.same_group = permissionBoolToString(item.permission);
            break;
          case "other_group":
            res.other = permissionBoolToString(item.permission);
            break;
          case "anonymous":
            res.anonymous = permissionBoolToString(item.permission);
            break;
        }
        break;
      case usersGroup:
        res.user_explicit = res.user_explicit ?? {};
        if (item.option.id) {
          res.user_explicit[item.option.id] = permissionBoolToString(item.permission);
        }
        break;
      case groupsGroup:
        res.group_explicit = res.group_explicit ?? {};
        if (item.option.id) {
          res.group_explicit[item.option.id] = permissionBoolToString(item.permission);
        }
        break;
    }
  });
  return res;
};

const PermissionList = (props: PermissionListProps) => {
  const { t } = useTranslation();

  const onOptionRemoved = useCallback(
    (option: Option) => {
      props.onChange?.((prev) =>
        prev.filter((item) => item.option.id !== option.id || item.option.group !== option.group),
      );
    },
    [props.onChange],
  );

  const onOptChange = useCallback(
    (option: PermissionListItem) => {
      props.onChange?.((prev) =>
        prev.map((item) =>
          item.option.id === option.option.id && item.option.group === option.option.group ? option : item,
        ),
      );
    },
    [props.onChange],
  );

  const onOptionAdded = useCallback(
    (option: Option) => {
      if (props.list.find((item) => item.option.id === option.id && item.option.group === option.group)) {
        enqueueSnackbar(t("application:modals.targetExisted"), {
          variant: "warning",
          action: DefaultCloseAction,
        });
        return;
      }

      // set items sort by option.priority (desc)
      props.onChange?.((prev) =>
        [
          ...prev,
          {
            option,
            permission: {
              list: true,
              read: false,
              update: false,
              create: false,
              delete: false,
              share: false,
            },
          },
        ].sort((a, b) => (b.option.priority ?? 0) - (a.option.priority ?? 0)),
      );
    },
    [props.list, props.onChange],
  );

  // remove last 2 elements
  const generalList = props.list.slice(0, props.list.length - 2);

  // only last 2 elements
  const lastTwo = props.list.slice(-2);

  const readOnly = props.onChange === undefined;

  return (
    <Stack gap={2}>
      {!readOnly && <AudienceSearch onOptionAdded={onOptionAdded} />}
      <Collapse in={generalList.length > 0} unmountOnExit>
        <Box>
          <Typography variant={"subtitle2"}>{t("application:modals.explicitAccess")}</Typography>
          <List sx={{ width: "100%" }}>
            <TransitionGroup>
              {generalList.map((item) => (
                <Collapse key={item.option.group + "_" + item.option.id}>
                  <PermissionSettingItem
                    onOptChange={onOptChange}
                    onOptionRemoved={onOptionRemoved}
                    item={item}
                    readOnly={readOnly}
                  />
                </Collapse>
              ))}
            </TransitionGroup>
          </List>
        </Box>
      </Collapse>
      <Box>
        <Typography variant={"subtitle2"}>{t("application:modals.generalAccess")}</Typography>
        <List sx={{ width: "100%" }}>
          <TransitionGroup>
            {lastTwo.map((item) => (
              <Collapse key={item.option.group + "_" + item.option.id}>
                <PermissionSettingItem
                  onOptChange={onOptChange}
                  onOptionRemoved={onOptionRemoved}
                  item={item}
                  readOnly={readOnly}
                />
              </Collapse>
            ))}
          </TransitionGroup>
        </List>
      </Box>
    </Stack>
  );
};

export default PermissionList;
