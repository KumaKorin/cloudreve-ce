import {
  Box,
  ListItemIcon,
  ListItemText,
  MenuList,
  Popover,
  PopoverProps,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavigatorCapability, StoragePolicy } from "../../../api/explorer.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { mountStoragePolicy } from "../../../redux/thunks/file.ts";
import { refreshPolicyOptions } from "../../../redux/thunks/settings.ts";
import SessionManager from "../../../session";
import Boolset from "../../../util/boolset.ts";
import Checkmark from "../../Icons/Checkmark.tsx";
import { DenseDivider, EmptyMenu, SquareMenuItem } from "../ContextMenu/ContextMenu.tsx";
import { FmIndexContext } from "../FmIndexContext.tsx";

interface MountStoragePolicyProps {
  onClose?: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}
const MountStoragePolicy = ({ onClose }: MountStoragePolicyProps) => {
  const { t } = useTranslation();
  const fmIndex = useContext(FmIndexContext);
  const list = useAppSelector((state) => state.fileManager[fmIndex].list);
  const policyOptions = useAppSelector((state) => state.globalState.policyOptionCache);
  const dispatch = useAppDispatch();
  const isLogin = !!SessionManager.currentLoginOrNull();

  useEffect(() => {
    if (!policyOptions && isLogin) {
      dispatch(refreshPolicyOptions());
    }
  }, []);

  const capabilityBs = useMemo(() => {
    return new Boolset(list?.props.capability);
  }, [list?.props.capability]);

  const showNoAction = !capabilityBs.enabled(NavigatorCapability.mount) || list?.single_file_view;
  const showOption = list?.parent?.owned;

  const onClick = useCallback(
    (policy: StoragePolicy) => () => {
      onClose && onClose({}, "escapeKeyDown");
      dispatch(mountStoragePolicy(fmIndex, policy));
    },
    [dispatch, onClose],
  );

  return (
    <>
      {showNoAction && (
        <Box sx={{ py: 0.5 }}>
          <EmptyMenu />
        </Box>
      )}
      {!showNoAction && !showOption && (
        <Box sx={{ py: 1 }}>
          <Box sx={{ px: 2 }}>
            <Typography variant={"body2"} fontWeight={600}>
              {t("uploader.storagePolicy")}
            </Typography>
            <Typography variant={"body2"}>{list?.storage_policy?.name}</Typography>
          </Box>
          <DenseDivider />
          <Box sx={{ px: 2 }}>
            <Typography variant={"body2"} color={"text.secondary"}>
              {t("fileManager.mountOwner")}
            </Typography>
          </Box>
        </Box>
      )}
      {!showNoAction && showOption && (
        <MenuList dense sx={{ py: 0.5, maxWidth: 250 }}>
          {policyOptions &&
            policyOptions.map((policy) => (
              <SquareMenuItem onClick={onClick(policy)}>
                {policy.id == list?.storage_policy?.id && (
                  <ListItemIcon>
                    <Checkmark />
                  </ListItemIcon>
                )}
                <ListItemText sx={{ whiteSpace: "normal" }} inset={policy.id != list?.storage_policy?.id}>
                  {policy.name}
                </ListItemText>
              </SquareMenuItem>
            ))}
          {(!policyOptions || policyOptions.length == 0) && [
            <SquareMenuItem>
              <ListItemText inset>
                <Skeleton variant={"text"} sx={{ width: 100 }} />
              </ListItemText>
            </SquareMenuItem>,
            <SquareMenuItem>
              <ListItemText inset>
                <Skeleton variant={"text"} sx={{ width: 100 }} />
              </ListItemText>
            </SquareMenuItem>,
          ]}
        </MenuList>
      )}
    </>
  );
};

const MountStoragePolicyPopover = ({ onClose, ...rest }: PopoverProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Popover
      elevation={3}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: isMobile ? "right" : "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: isMobile ? "right" : "left",
      }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: "8px",
          },
        },
      }}
      onClose={onClose}
      {...rest}
    >
      <MountStoragePolicy onClose={onClose} />
    </Popover>
  );
};

export default MountStoragePolicyPopover;
