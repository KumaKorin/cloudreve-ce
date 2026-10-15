import { Box, Checkbox, Collapse, DialogContent, IconButton, Stack, Tooltip, useTheme } from "@mui/material";
import dayjs from "dayjs";
import { TFunction } from "i18next";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { Share as ShareModel } from "../../../../api/explorer.ts";
import { GroupPermission } from "../../../../api/user.ts";
import { closeShareLinkDialog } from "../../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../../redux/hooks.ts";
import { createOrUpdateShareLink } from "../../../../redux/thunks/share.ts";
import SessionManager from "../../../../session";
import { copyToClipboard, sendLink } from "../../../../util";
import Boolset from "../../../../util/boolset.ts";
import AutoHeight from "../../../Common/AutoHeight.tsx";
import { FilledTextField, SmallFormControlLabel } from "../../../Common/StyledComponents.tsx";
import DraggableDialog from "../../../Dialogs/DraggableDialog.tsx";
import ArrowLeft from "../../../Icons/ArrowLeft.tsx";
import CopyOutlined from "../../../Icons/CopyOutlined.tsx";
import Setting from "../../../Icons/Setting.tsx";
import Share from "../../../Icons/Share.tsx";
import { builtinCollectionID } from "../../FileInfo/Permission/AudienceSearch.tsx";
import { builtinGroup } from "../../FileInfo/Permission/OptionIcon.tsx";
import PermissionList, { PermissionListItem } from "../../FileInfo/Permission/PermissionList.tsx";
import { FileManagerIndex } from "../../FileManager.tsx";
import { preparePermissionSetting } from "../SetPermission.tsx";
import ShareSettingContent, { downloadOptions, expireOptions, ShareSetting } from "./ShareSetting.tsx";

const initialSetting: ShareSetting = {
  expires_val: expireOptions[2],
  downloads_val: downloadOptions[0],
  price_val: 0,
};

interface ShareLinkPassword {
  shareLink: string;
  password?: string;
}

const shareToSetting = (share: ShareModel, t: TFunction): ShareSetting => {
  const res: ShareSetting = {
    is_private: share.is_private,
    password: share.password,
    use_custom_password: true,
    share_view: share.share_view,
    show_readme: share.show_readme,
    downloads: share.remain_downloads != undefined && share.remain_downloads > 0,
    price: !!share.price,

    price_val: share.price ?? 0,
    expires_val: expireOptions[2],
    downloads_val: downloadOptions[0],
  };

  if (res.downloads) {
    res.downloads_val = {
      value: share.remain_downloads ?? 0,
      label: (share.remain_downloads ?? 0).toString(),
    };
  }

  if (share.expires != undefined) {
    const expires = dayjs(share.expires);
    const isExpired = expires.isBefore(dayjs());
    if (!isExpired) {
      res.expires = true;
      const secondsTtl = dayjs(share.expires).diff(dayjs(), "second");
      res.expires_val = {
        value: secondsTtl,
        label: Math.round(secondsTtl / 60) + " " + t("application:modals.minutes"),
      };
    } else {
      res.expires = false;
    }
  }

  return res;
};

export const isAnonymousReadOnly = (): boolean => {
  const user = SessionManager.currentLoginOrNull();
  let anonymousReadonly = false;
  if (user && user.user.group?.permission) {
    const bs = new Boolset(user.user.group.permission);
    anonymousReadonly = !bs.enabled(GroupPermission.set_anonymous_permission);
  }

  return anonymousReadonly;
};

export const useDefaultPermissionSetting = (t: TFunction) => {
  return useMemo((): PermissionListItem[] => {
    let anonymousReadonly = isAnonymousReadOnly();
    return [
      {
        option: {
          name: t("application:modals.anonymous"),
          group: builtinGroup,
          id: builtinCollectionID.anonymous,
          priority: 0,
        },
        permission: {
          list: true,
          read: true,
          update: false,
          create: false,
          delete: false,
          share: false,
        },
        disableRemove: anonymousReadonly,
        disableShare: true,
        disableSetHigherPerm: anonymousReadonly,
      },
      {
        option: {
          name: t("application:modals.everyone"),
          group: builtinGroup,
          id: builtinCollectionID.everyone,
          priority: 0,
        },
        permission: {
          list: true,
          read: true,
          update: false,
          create: false,
          delete: false,
          share: false,
        },
        disableShare: true,
        disableRemove: true,
      },
    ];
  }, [t]);
};

const ShareDialog = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const defaultPermissionSetting = useDefaultPermissionSetting(t);

  const [loading, setLoading] = useState(false);
  const [setting, setSetting] = useState<ShareSetting>(initialSetting);
  const [showSetting, setShowSetting] = useState(false);
  const [listItem, setListItem] = useState<PermissionListItem[]>(defaultPermissionSetting);
  const [shareLink, setShareLink] = useState<string>("");
  const [includePassword, setIncludePassword] = useState(true);
  const shareLinkPassword = useMemo(() => {
    const start = shareLink.lastIndexOf("/s/");
    const shareLinkParts = shareLink.substring(start + 3).split("/");
    const password = shareLinkParts.length == 2 ? shareLinkParts[1] : undefined;
    return {
      shareLink: password ? shareLink.substring(0, shareLink.lastIndexOf("/")) : shareLink,
      password: password,
    } as ShareLinkPassword;
  }, [shareLink]);

  const open = useAppSelector((state) => state.globalState.shareLinkDialogOpen);
  const target = useAppSelector((state) => state.globalState.shareLinkDialogFile);
  const editTarget = useAppSelector((state) => state.globalState.shareLinkDialogShare);

  useEffect(() => {
    if (open) {
      if (editTarget) {
        preparePermissionSetting(editTarget.permission_setting ?? {}, t, defaultPermissionSetting, dispatch).then(
          (list) => {
            setListItem(list);
          },
        );

        setSetting(shareToSetting(editTarget, t));
      } else {
        setListItem(defaultPermissionSetting);
        setSetting(initialSetting);
      }
      setShowSetting(false);
      setShareLink("");
      setIncludePassword(true);
    }
  }, [open]);

  const onClose = useCallback(() => {
    if (!loading) {
      dispatch(closeShareLinkDialog());
    }
  }, [dispatch, loading]);

  const onAccept = useCallback(
    async (e?: React.MouseEvent<HTMLElement>) => {
      if (e) {
        e.preventDefault();
      }

      if (!target) return;

      if (shareLink) {
        copyToClipboard(shareLink);
        return;
      }

      setLoading(true);
      try {
        const shareLink = await dispatch(
          createOrUpdateShareLink(FileManagerIndex.main, target, listItem, setting, editTarget?.id),
        );
        setShareLink(shareLink);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    },
    [dispatch, target, shareLink, editTarget, setLoading, setting, setShareLink, listItem],
  );

  const finalShareLink = useMemo(() => {
    if (includePassword) {
      return shareLink;
    }
    return shareLink.substring(0, shareLink.lastIndexOf("/"));
  }, [includePassword, shareLink]);

  const finalShareLinkPassword = useMemo(() => {
    if (!includePassword) {
      return shareLink.substring(shareLink.lastIndexOf("/") + 1);
    }
    return undefined;
  }, [includePassword, shareLink]);

  return (
    <>
      <DraggableDialog
        title={t(`application:modals.${editTarget ? "edit" : "create"}ShareLink`)}
        showActions
        loading={loading}
        showCancel
        hideOk={!!shareLink}
        onAccept={onAccept}
        dialogProps={{
          open: open ?? false,
          onClose: onClose,
          fullWidth: true,
          maxWidth: "xs",
        }}
        cancelText={shareLink ? t("common:close") : undefined}
        secondaryAction={
          shareLink ? (
            // @ts-ignore
            navigator.share && (
              <Tooltip title={t("application:modals.sendLink")}>
                <IconButton onClick={() => sendLink(target?.name ?? "", finalShareLink)}>
                  <Share />
                </IconButton>
              </Tooltip>
            )
          ) : (
            <Tooltip title={t(showSetting ? "application:fileManager.back" : "application:modals.advanceOptions")}>
              <IconButton onClick={() => setShowSetting((prev) => !prev)}>
                {showSetting ? <ArrowLeft /> : <Setting />}
              </IconButton>
            </Tooltip>
          )
        }
      >
        <DialogContent sx={{ pb: 0 }}>
          <AutoHeight>
            <SwitchTransition>
              <CSSTransition
                addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
                classNames="fade"
                key={showSetting.toString()}
              >
                <Box>
                  {!showSetting && !shareLink && <PermissionList onChange={setListItem} list={listItem} />}
                  {showSetting && !shareLink && (
                    <ShareSettingContent
                      editing={!!editTarget}
                      onSettingChange={setSetting}
                      setting={setting}
                      file={target}
                    />
                  )}
                  {shareLink && (
                    <Stack spacing={1}>
                      <FilledTextField
                        variant={"filled"}
                        inputProps={{ readonly: true }}
                        label={t("modals.shareLink")}
                        fullWidth
                        value={finalShareLink ?? ""}
                        onFocus={(e) => e.target.select()}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <IconButton
                                onClick={() => copyToClipboard(finalShareLink)}
                                size="small"
                                sx={{ marginRight: -1 }}
                              >
                                <CopyOutlined />
                              </IconButton>
                            ),
                          },
                        }}
                      />
                      {shareLinkPassword.password && (
                        <>
                          <Collapse in={!includePassword}>
                            <FilledTextField
                              variant={"filled"}
                              inputProps={{ readonly: true }}
                              label={t("modals.sharePassword")}
                              fullWidth
                              value={finalShareLinkPassword ?? ""}
                              onFocus={(e) => e.target.select()}
                              slotProps={{
                                input: {
                                  endAdornment: (
                                    <IconButton
                                      onClick={() => copyToClipboard(finalShareLinkPassword ?? "")}
                                      size="small"
                                      sx={{ marginRight: -1 }}
                                    >
                                      <CopyOutlined />
                                    </IconButton>
                                  ),
                                },
                              }}
                            />
                          </Collapse>
                          <Tooltip enterDelay={100} title={t("application:modals.includePasswordInShareLinkDes")}>
                            <SmallFormControlLabel
                              sx={{
                                mt: "0!important",
                              }}
                              control={
                                <Checkbox
                                  disableRipple
                                  sx={{
                                    pl: 0,
                                  }}
                                  size="small"
                                  checked={includePassword}
                                  onChange={() => {
                                    setIncludePassword(!includePassword);
                                  }}
                                />
                              }
                              label={t("application:modals.includePasswordInShareLink")}
                            />
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
              </CSSTransition>
            </SwitchTransition>
          </AutoHeight>
        </DialogContent>
      </DraggableDialog>
    </>
  );
};
export default ShareDialog;
