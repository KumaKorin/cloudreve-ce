import {
  Box,
  Chip,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { sendRelocate } from "../../../api/api.ts";
import { closeRelocateDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { refreshPolicyOptions } from "../../../redux/thunks/settings.ts";
import SessionManager from "../../../session";
import { getFileLinkedUri } from "../../../util";
import { ViewTaskAction } from "../../Common/Snackbar/snackbar.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import FileBadge from "../FileBadge.tsx";

const Relocate = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState("");

  const open = useAppSelector((state) => state.globalState.relocateDialogOpen);
  const targets = useAppSelector((state) => state.globalState.relocateDialogFiles);
  const policyOptions = useAppSelector((state) => state.globalState.policyOptionCache);
  const isLogin = !!SessionManager.currentLoginOrNull();

  useEffect(() => {
    if (open && !policyOptions && isLogin) {
      dispatch(refreshPolicyOptions());
    }
  }, [open, policyOptions, isLogin, dispatch]);

  useEffect(() => {
    if (open && policyOptions && policyOptions.length > 0 && !selectedPolicy) {
      setSelectedPolicy(policyOptions[0].id);
    }
  }, [open, policyOptions, selectedPolicy]);

  const onClose = useCallback(() => {
    dispatch(closeRelocateDialog());
  }, [dispatch]);

  const onAccept = useCallback(() => {
    if (!targets || targets.length === 0 || !selectedPolicy) {
      return;
    }

    setLoading(true);
    dispatch(
      sendRelocate({
        src: targets.map((file) => getFileLinkedUri(file)),
        dst_policy_id: selectedPolicy,
      }),
    )
      .then(() => {
        dispatch(closeRelocateDialog());
        enqueueSnackbar({
          message: t("application:modals.taskCreated"),
          variant: "success",
          action: ViewTaskAction(),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [targets, selectedPolicy, dispatch, enqueueSnackbar, t]);

  return (
    <DraggableDialog
      title={t("dashboard:task.relocate")}
      showActions
      loading={loading}
      showCancel
      disabled={!selectedPolicy || !targets || targets.length === 0}
      onAccept={onAccept}
      dialogProps={{
        open: open ?? false,
        onClose: onClose,
        fullWidth: true,
        maxWidth: "sm",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          {targets && targets.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t("application:fileManager.selectedFiles", {
                  defaultValue: "所选项目",
                })}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, maxHeight: 120, overflowY: "auto", py: 0.5 }}>
                {targets.slice(0, 5).map((file) => (
                  <FileBadge key={file.id} file={file} clickable={false} />
                ))}
                {targets.length > 5 && (
                  <Chip
                    label={`+${targets.length - 5}`}
                    size="small"
                    variant="outlined"
                    sx={{ alignSelf: "center" }}
                  />
                )}
              </Box>
            </Box>
          )}
          <FormControl fullWidth variant="outlined">
            <InputLabel id="relocate-policy-label">{t("application:uploader.storagePolicy")}</InputLabel>
            <Select
              labelId="relocate-policy-label"
              label={t("application:uploader.storagePolicy")}
              value={selectedPolicy}
              onChange={(e) => setSelectedPolicy(e.target.value as string)}
            >
              {policyOptions?.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default Relocate;
