import { Box, DialogContent, IconButton, Tooltip, Typography } from "@mui/material";
import { TFunction } from "i18next";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { getAllGroups, getFileInfo, sendClearPermission, sendSetPermission } from "../../../api/api.ts";
import { FilePermission, PermissionSettingReq } from "../../../api/explorer.ts";
import { Group, User } from "../../../api/user.ts";
import { closePermissionDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { AppDispatch } from "../../../redux/store.ts";
import { loadUserInfo } from "../../../redux/thunks/session.ts";
import Boolset from "../../../util/boolset.ts";
import AutoHeight from "../../Common/AutoHeight.tsx";
import FacebookCircularProgress from "../../Common/CircularProgress.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import Broom from "../../Icons/Broom.tsx";
import {
  builtinOtherGroupOption,
  buitinSameGroupOption,
  GroupPriority,
  UserPriority,
} from "../FileInfo/Permission/AudienceSearch.tsx";
import PermissionList, { PermissionListItem, PermissionListToParams } from "../FileInfo/Permission/PermissionList.tsx";
import { isAnonymousReadOnly, useDefaultPermissionSetting } from "./Share/ShareDialog.tsx";

const PermissionSettingToListItem = (
  settings: PermissionSettingReq,
  defaultSettings: PermissionListItem[],
  additional: (UserExtended | Group[] | undefined)[],
  t: TFunction,
): PermissionListItem[] => {
  let anonymousReadonly = isAnonymousReadOnly();
  let res: PermissionListItem[] = [];
  const userMaps: { [key: string]: User } = {};
  const groupMaps: { [key: string]: Group } = {};
  additional.forEach((item) => {
    if ((item as UserExtended).is_user) {
      const user = item as UserExtended;
      userMaps[user.id] = user;
    } else if (item instanceof Array) {
      item.forEach((g) => {
        groupMaps[g.id] = g;
      });
    }
  });

  Object.keys(settings.user_explicit ?? {}).forEach((uid) => {
    if (!userMaps[uid]) {
      return;
    }

    let bs = new Boolset(settings.user_explicit?.[uid]);
    res.push({
      option: {
        priority: UserPriority,
        description: userMaps[uid].email ?? uid,
        group: "application:modals.users",
        id: uid,
        user: userMaps[uid],
        name: userMaps[uid].nickname,
      },
      permission: {
        list: bs.enabled(FilePermission.list) || bs.enabled(FilePermission.read),
        read: bs.enabled(FilePermission.read),
        update: bs.enabled(FilePermission.update),
        create: bs.enabled(FilePermission.create),
        delete: bs.enabled(FilePermission.delete),
        share: bs.enabled(FilePermission.share),
      },
    });
  });

  Object.keys(settings.group_explicit ?? {}).forEach((gid) => {
    if (!groupMaps[gid]) {
      return;
    }

    let bs = new Boolset(settings.group_explicit?.[gid]);
    res.push({
      option: {
        priority: GroupPriority,
        description: groupMaps[gid].name,
        group: "application:modals.groups",
        id: gid,
        name: groupMaps[gid].name,
      },
      permission: {
        list: bs.enabled(FilePermission.list) || bs.enabled(FilePermission.read),
        read: bs.enabled(FilePermission.read),
        update: bs.enabled(FilePermission.update),
        create: bs.enabled(FilePermission.create),
        delete: bs.enabled(FilePermission.delete),
        share: bs.enabled(FilePermission.share),
      },
    });
  });

  if (settings.same_group) {
    let bs = new Boolset(settings.same_group);
    res.push({
      option: buitinSameGroupOption(t),
      permission: {
        list: bs.enabled(FilePermission.list) || bs.enabled(FilePermission.read),
        read: bs.enabled(FilePermission.read),
        update: bs.enabled(FilePermission.update),
        create: bs.enabled(FilePermission.create),
        delete: bs.enabled(FilePermission.delete),
        share: bs.enabled(FilePermission.share),
      },
    });
  }

  if (settings.other) {
    let bs = new Boolset(settings.other);
    res.push({
      option: builtinOtherGroupOption(t),
      permission: {
        list: bs.enabled(FilePermission.list) || bs.enabled(FilePermission.read),
        read: bs.enabled(FilePermission.read),
        update: bs.enabled(FilePermission.update),
        create: bs.enabled(FilePermission.create),
        delete: bs.enabled(FilePermission.delete),
        share: bs.enabled(FilePermission.share),
      },
    });
  }

  // For everyone
  const bs2 = new Boolset(settings.everyone);
  const everyonePrm = {
    ...defaultSettings[1],
    permission: settings.everyone
      ? {
          list: bs2.enabled(FilePermission.list) || bs2.enabled(FilePermission.read),
          read: bs2.enabled(FilePermission.read),
          update: bs2.enabled(FilePermission.update),
          create: bs2.enabled(FilePermission.create),
          delete: bs2.enabled(FilePermission.delete),
          share: bs2.enabled(FilePermission.share),
        }
      : {
          list: true,
          read: true,
          update: true,
          create: true,
          delete: true,
          share: true,
        },
  };

  // For anonymous
  const bs = new Boolset(settings.anonymous);
  res.push({
    ...defaultSettings[0],
    permission: settings.anonymous
      ? {
          list: bs.enabled(FilePermission.list) || bs.enabled(FilePermission.read),
          read: bs.enabled(FilePermission.read),
          update: bs.enabled(FilePermission.update),
          create: bs.enabled(FilePermission.create),
          delete: bs.enabled(FilePermission.delete),
          share: bs.enabled(FilePermission.share),
        }
      : everyonePrm.permission,
  });

  // Forv everyone, push it to the end
  res.push(everyonePrm);

  return res;
};

interface UserExtended extends User {
  is_user: boolean;
}

const tryLoadUser = async (uid: string, dispatch: AppDispatch) => {
  try {
    return {
      ...(await dispatch(loadUserInfo(uid))),
      is_user: true,
    } as UserExtended;
  } catch (e) {
    return undefined;
  }
};

export const preparePermissionSetting = async (
  permissions: PermissionSettingReq,
  t: TFunction,
  defaultPermissionSetting: PermissionListItem[],
  dispatch: AppDispatch,
) => {
  // permission loaded, load all users,groups in the permission settings
  const promises: Promise<UserExtended | Group[] | undefined>[] = [];
  Object.keys(permissions.user_explicit ?? {}).forEach((uid) => {
    promises.push(tryLoadUser(uid, dispatch));
  });
  if (permissions.group_explicit) {
    promises.push(dispatch(getAllGroups()));
  }
  try {
    const additional = await Promise.all(promises);
    return PermissionSettingToListItem(permissions ?? {}, defaultPermissionSetting, additional, t);
  } catch (e) {
    return defaultPermissionSetting;
  }
};

const SetPermission = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const defaultPermissionSetting = useDefaultPermissionSetting(t);

  const [loading, setLoading] = useState(false);
  const [introLoading, setIntroLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [listItem, setListItem] = useState<PermissionListItem[]>(defaultPermissionSetting);

  const open = useAppSelector((state) => state.globalState.setPermissionDialogOpen);
  const targets = useAppSelector((state) => state.globalState.setPermissionDialogFiles);

  const tryLoadUser = async (uid: string) => {
    try {
      return {
        ...(await dispatch(loadUserInfo(uid))),
        is_user: true,
      } as UserExtended;
    } catch (e) {
      return undefined;
    }
  };

  useEffect(() => {
    if (!open || !targets) {
      return;
    }

    // More than 1 files, treat as no permission is set
    if (targets.length > 1) {
      setListItem(defaultPermissionSetting);
      setShowIntro(true);
      setIntroLoading(false);
      return;
    }

    setIntroLoading(true);
    dispatch(
      getFileInfo({
        uri: targets[0].path,
        extended: true,
      }),
    )
      .then((res) => {
        if (res.extended_info?.permissions) {
          preparePermissionSetting(res.extended_info.permissions, t, defaultPermissionSetting, dispatch)
            .then((list) => {
              setListItem(list);
            })
            .finally(() => {
              setShowIntro(false);
            });
        } else {
          // No permission is set
          setShowIntro(true);
          setListItem(defaultPermissionSetting);
        }
      })
      .finally(() => {
        setIntroLoading(false);
      });
  }, [open, targets]);

  const onClose = useCallback(() => {
    if (!loading) {
      dispatch(closePermissionDialog());
    }
  }, [dispatch, loading]);

  const onAccept = useCallback(
    async (e?: React.MouseEvent<HTMLElement>) => {
      if (e) {
        e.preventDefault();
      }

      if (!targets) return;

      if (showIntro) {
        setShowIntro(false);
        setListItem(defaultPermissionSetting);
        return;
      }

      setLoading(true);
      dispatch(
        sendSetPermission({
          uris: targets.map((f) => f.path),
          setting: PermissionListToParams(listItem),
        }),
      )
        .then(() => {
          dispatch(closePermissionDialog());
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [dispatch, defaultPermissionSetting, listItem, targets, showIntro],
  );

  const clearPermissions = useCallback(() => {
    if (!targets) {
      return;
    }

    setLoading(true);
    dispatch(
      sendClearPermission({
        uris: targets.map((f) => f.path),
      }),
    )
      .then(() => {
        setListItem(defaultPermissionSetting);
        setShowIntro(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, setLoading, targets]);

  return (
    <DraggableDialog
      title={t("application:fileManager.permissions")}
      showActions
      showCancel
      okText={showIntro ? t("fileManager.setNow") : undefined}
      loading={loading}
      onAccept={onAccept}
      dialogProps={{
        open: open ?? false,
        onClose: onClose,
        fullWidth: true,
        maxWidth: "xs",
      }}
      secondaryAction={
        !introLoading &&
        !showIntro && (
          <Tooltip title={t("application:modals.clearPermissions")}>
            <IconButton onClick={clearPermissions} disabled={loading}>
              <Broom />
            </IconButton>
          </Tooltip>
        )
      }
    >
      <DialogContent>
        <AutoHeight>
          <SwitchTransition>
            <CSSTransition
              addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
              classNames="fade"
              key={`${introLoading}-${showIntro}`}
            >
              <Box>
                {introLoading && (
                  <Box
                    sx={{
                      pt: 2,
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <FacebookCircularProgress />
                  </Box>
                )}
                {!introLoading && showIntro && (
                  <Box
                    sx={{
                      pt: 2,
                      height: "100%",
                      textAlign: "center",
                    }}
                  >
                    <Typography>{t("application:fileManager.permissionNotSet")}</Typography>
                    <Typography variant={"body2"} color={"text.secondary"}>
                      {t("application:fileManager.permissionNotSetDes")}
                    </Typography>
                  </Box>
                )}
                {!introLoading && !showIntro && <PermissionList onChange={setListItem} list={listItem} />}
              </Box>
            </CSSTransition>
          </SwitchTransition>
        </AutoHeight>
      </DialogContent>
    </DraggableDialog>
  );
};
export default SetPermission;
