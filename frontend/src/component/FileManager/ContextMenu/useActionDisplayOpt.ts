import { useMemo } from "react";
import { FilePermission, FileResponse, FileType, Metadata, NavigatorCapability } from "../../../api/explorer.ts";
import { GroupPermission } from "../../../api/user.ts";
import { ContextMenuTypes } from "../../../redux/fileManagerSlice.ts";
import { Viewers, ViewersByID } from "../../../redux/siteConfigSlice.ts";
import { ExpandedViewerSetting } from "../../../redux/thunks/viewer.ts";
import SessionManager from "../../../session";
import { fileExtension } from "../../../util";
import Boolset from "../../../util/boolset.ts";
import { FileManagerIndex } from "../FileManager.tsx";

const supportedArchiveTypes = ["zip", "gz", "xz", "tar", "rar", "7z", "bz2"];

export const canManageVersion = (file: FileResponse, bs: Boolset) => {
  return (
    file.type == FileType.file &&
    (!file.metadata || !file.metadata[Metadata.share_redirect]) &&
    bs.enabled(NavigatorCapability.version_control)
  );
};

export const canShowInfo = (readableOrCap: boolean | Boolset, cap?: Boolset) => {
  if (typeof readableOrCap === "boolean") {
    return readableOrCap && (cap ? cap.enabled(NavigatorCapability.info) : false);
  }
  return readableOrCap.enabled(NavigatorCapability.info);
};

export const canUpdate = (opt: DisplayOption) => {
  return !!(
    opt.allUpdatable &&
    opt.hasFile &&
    opt.orCapability?.enabled(NavigatorCapability.upload_file) &&
    opt.allUpdatable
  );
};

export interface DisplayOption {
  allReadable: boolean;
  allListable: boolean;
  allUpdatable: boolean;
  allCreatable: boolean;
  allDeletable: boolean;
  allShareable: boolean;

  hasReadable?: boolean;
  hasListable?: boolean;
  hasUpdatable?: boolean;
  hasCreatable?: boolean;
  hasDeletable?: boolean;
  hasShareable?: boolean;

  hasTrashFile?: boolean;
  hasFile?: boolean;
  hasFolder?: boolean;
  hasOwned?: boolean;
  hasFailedThumb?: boolean;

  showEnter?: boolean;
  showOpen?: boolean;
  showOpenWithCascading?: () => boolean;
  showOpenWith?: () => boolean;
  showDownload?: boolean;
  showGoToSharedLink?: boolean;
  showExtractArchive?: boolean;
  showTorrentRemoteDownload?: boolean;
  showGoToParent?: boolean;

  showDelete?: boolean;
  showRestore?: boolean;
  showRename?: boolean;
  showPin?: boolean;
  showOrganize?: boolean;
  showCopy?: boolean;
  showShare?: boolean;
  showInfo?: boolean;
  showDirectLink?: boolean;

  showMove?: boolean;
  showTags?: boolean;
  showChangeFolderColor?: boolean;
  showChangeIcon?: boolean;
  showCustomProps?: boolean;

  showMore?: boolean;
  showVersionControl?: boolean;
  showDirectLinkManagement?: boolean;
  showPermissions?: boolean;
  showManageShares?: boolean;
  showActivities?: boolean;
  showCreateArchive?: boolean;
  showResetThumb?: boolean;
  showRelocate?: boolean;

  andCapability?: Boolset;
  orCapability?: Boolset;

  showCreateFolder?: boolean;
  showCreateFile?: boolean;
  showRefresh?: boolean;
  showNewFileFromTemplate?: boolean;
  showUpload?: boolean;
  showRemoteDownload?: boolean;
}

const capabilityMap: { [key: string]: Boolset } = {};

export const getActionOpt = (
  targets: FileResponse[],
  viewerSetting?: ExpandedViewerSetting,
  type?: string,
  parent?: FileResponse,
  fmIndex: number = 0,
): DisplayOption => {
  const currentUser = SessionManager.currentLoginOrNull();
  const currentUserAnonymous = SessionManager.currentUser();
  const groupBs = SessionManager.currentUserGroupPermission();
  const display: DisplayOption = {
    allReadable: true,
    allListable: true,
    allUpdatable: true,
    allCreatable: true,
    allDeletable: true,
    allShareable: true,
  };
  if (type == ContextMenuTypes.empty || type == ContextMenuTypes.new) {
    display.showRefresh = type == ContextMenuTypes.empty;
    display.showRemoteDownload = groupBs.enabled(GroupPermission.remote_download) && !!currentUser;

    if (!parent || parent.type != FileType.folder) {
      display.showRemoteDownload = display.showRemoteDownload && type == ContextMenuTypes.new;
      return display;
    }

    const parentCap = new Boolset(parent.capability);
    const parentPerm = new Boolset(parent.permission);
    display.showCreateFolder =
      parentCap.enabled(NavigatorCapability.create_file) &&
      (parent.permission == undefined || parentPerm.enabled(FilePermission.create));
    display.showCreateFile = display.showCreateFolder && fmIndex == FileManagerIndex.main;
    display.showUpload = display.showCreateFile;
    if (display.showCreateFile) {
      const allViewers = Object.entries(ViewersByID);
      for (let i = 0; i < allViewers.length; i++) {
        if (allViewers[i][1] && allViewers[i][1].templates) {
          display.showNewFileFromTemplate = true;
          break;
        }
      }
    }

    return display;
  }

  if (type == ContextMenuTypes.searchResult) {
    display.showGoToParent = true;
  }

  targets.forEach((target) => {
    let readable = true;
    let listable = true;
    let updatable = true;
    let creatable = true;
    let deletable = true;
    let shareable = true;
    if (target.permission) {
      const bs = new Boolset(target.permission);
      readable = bs.enabled(FilePermission.read);
      // List (browse / metadata) is implied by Read for legacy permissions.
      listable = bs.enabled(FilePermission.list) || readable;
      updatable = bs.enabled(FilePermission.update);
      creatable = bs.enabled(FilePermission.create);
      deletable = bs.enabled(FilePermission.delete);
      shareable = bs.enabled(FilePermission.share);
    }

    if (display.allReadable && !readable) {
      display.allReadable = false;
    }
    if (display.allListable && !listable) {
      display.allListable = false;
    }
    if (display.allUpdatable && !updatable) {
      display.allUpdatable = false;
    }
    if (display.allCreatable && !creatable) {
      display.allCreatable = false;
    }
    if (display.allDeletable && !deletable) {
      display.allDeletable = false;
    }
    if (display.allShareable && !shareable) {
      display.allShareable = false;
    }

    if (!display.hasReadable && readable) {
      display.hasReadable = true;
    }
    if (!display.hasListable && listable) {
      display.hasListable = true;
    }
    if (!display.hasUpdatable && updatable) {
      display.hasUpdatable = true;
    }
    if (!display.hasCreatable && creatable) {
      display.hasCreatable = true;
    }
    if (!display.hasDeletable && deletable) {
      display.hasDeletable = true;
    }
    if (!display.hasShareable && shareable) {
      display.hasShareable = true;
    }

    if (target.metadata) {
      if (target.metadata[Metadata.restore_uri]) {
        display.hasTrashFile = true;
      }
      if (target.metadata[Metadata.thumbDisabled] !== undefined) {
        display.hasFailedThumb = true;
      }
    }

    if (target.type == FileType.file) {
      display.hasFile = true;
    }

    if (target.type == FileType.folder) {
      display.hasFolder = true;
    }

    if (target.owned) {
      display.hasOwned = true;
    }

    if (target.capability) {
      let bs = capabilityMap[target.capability];
      if (!bs) {
        bs = new Boolset(target.capability);
        capabilityMap[target.capability] = bs;
      }

      if (!display.andCapability) {
        display.andCapability = bs;
      }

      display.andCapability = display.andCapability.and(bs);

      if (!display.orCapability) {
        display.orCapability = bs;
      }
      display.orCapability = display.orCapability.or(bs);
    }
  });

  const firstFileSuffix = fileExtension(targets[0]?.name ?? "");
  display.showPin = !display.hasTrashFile && targets.length == 1 && display.hasFolder;
  display.showDelete =
    display.hasDeletable &&
    display.orCapability &&
    (display.orCapability.enabled(NavigatorCapability.soft_delete) ||
      display.orCapability.enabled(NavigatorCapability.delete_file));
  display.showRestore = display.andCapability?.enabled(NavigatorCapability.restore);
  display.showRename =
    targets.length == 1 &&
    display.allUpdatable &&
    display.orCapability &&
    display.orCapability.enabled(NavigatorCapability.rename_file);
  display.showCopy =
    (display.hasReadable || display.hasUpdatable) &&
    display.orCapability &&
    (display.orCapability.enabled(NavigatorCapability.copy_to_my) ||
      display.orCapability.enabled(NavigatorCapability.copy_to_share) ||
      display.orCapability.enabled(NavigatorCapability.copy_to_trash) ||
      display.hasUpdatable);
  display.showShare =
    targets.length == 1 &&
    !!currentUser &&
    groupBs.enabled(GroupPermission.share) &&
    (targets[0].owned || groupBs.enabled(GroupPermission.is_admin) || display.hasShareable) &&
    display.orCapability &&
    display.orCapability.enabled(NavigatorCapability.share) &&
    (!targets[0].metadata ||
      (!targets[0].metadata[Metadata.share_redirect] && !targets[0].metadata[Metadata.restore_uri]));
  display.showMove =
    (display.hasDeletable || display.hasUpdatable) &&
    display.orCapability &&
    (display.orCapability.enabled(NavigatorCapability.move_to_share) ||
      display.orCapability.enabled(NavigatorCapability.move_to_trash) ||
      display.orCapability.enabled(NavigatorCapability.move_to_my) ||
      display.hasUpdatable);
  display.showTags =
    display.hasUpdatable && display.orCapability && display.orCapability.enabled(NavigatorCapability.update_metadata);
  display.showChangeFolderColor =
    display.hasUpdatable &&
    !display.hasFile &&
    display.orCapability &&
    display.orCapability.enabled(NavigatorCapability.update_metadata);
  display.showChangeIcon =
    display.hasUpdatable && display.orCapability && display.orCapability.enabled(NavigatorCapability.update_metadata);
  display.showCustomProps = display.showChangeIcon;
  display.showDownload =
    display.hasReadable && display.orCapability && display.orCapability.enabled(NavigatorCapability.download_file);
  display.showDirectLink =
    (display.hasOwned || groupBs.enabled(GroupPermission.is_admin)) &&
    display.orCapability &&
    (currentUserAnonymous?.group?.direct_link_batch_size ?? 0) >= targets.length &&
    display.orCapability.enabled(NavigatorCapability.download_file);
  display.showDirectLinkManagement = display.showDirectLink && targets.length == 1;
  display.showOpen =
    targets.length == 1 &&
    display.hasFile &&
    display.showDownload &&
    !!viewerSetting &&
    !!firstFileSuffix &&
    !!viewerSetting?.[firstFileSuffix];
  display.showEnter =
    targets.length == 1 &&
    display.hasFolder &&
    display.orCapability?.enabled(NavigatorCapability.enter_folder) &&
    display.allListable;
  display.showExtractArchive =
    targets.length == 1 &&
    display.hasFile &&
    display.showDownload &&
    !!currentUser &&
    groupBs.enabled(GroupPermission.archive_task) &&
    supportedArchiveTypes.includes(firstFileSuffix ?? "");
  display.showTorrentRemoteDownload =
    targets.length == 1 &&
    display.hasFile &&
    display.showDownload &&
    !!currentUser &&
    groupBs.enabled(GroupPermission.remote_download) &&
    firstFileSuffix == "torrent";

  display.showOpenWithCascading = () => false;
  display.showOpenWith = () => targets.length == 1 && !!display.hasFile && !!display.showDownload;
  if (display.showOpen) {
    display.showOpenWithCascading = () =>
      !!(display.showOpen && viewerSetting && viewerSetting[firstFileSuffix ?? ""]?.length >= 1);
    display.showOpenWith = () =>
      !!(display.showOpen && viewerSetting && viewerSetting[firstFileSuffix ?? ""]?.length < 1);
  }
  display.showOrganize = display.showPin || display.showMove || display.showChangeFolderColor || display.showChangeIcon;
  display.showGoToSharedLink =
    targets.length == 1 && display.hasFile && targets[0].metadata && !!targets[0].metadata[Metadata.share_redirect];
  display.showInfo =
    targets.length == 1 && display.orCapability && canShowInfo(!!display.hasListable, display.orCapability);
  display.showVersionControl =
    targets.length == 1 &&
    display.orCapability &&
    display.hasReadable &&
    canManageVersion(targets[0], display.orCapability);
  display.showPermissions =
    (display.hasOwned || groupBs.enabled(GroupPermission.is_admin)) &&
    display.orCapability &&
    display.orCapability.enabled(NavigatorCapability.set_permission);
  display.showManageShares =
    targets.length == 1 &&
    targets[0].shared &&
    display.orCapability &&
    !!currentUser &&
    groupBs.enabled(GroupPermission.share) &&
    display.orCapability.enabled(NavigatorCapability.share);
  display.showActivities = display.showInfo && display.hasUpdatable;
  display.showCreateArchive =
    display.hasReadable &&
    !!currentUser &&
    groupBs.enabled(GroupPermission.archive_task) &&
    display.orCapability &&
    display.orCapability.enabled(NavigatorCapability.download_file);
  display.showRelocate =
    (display.hasOwned || groupBs.enabled(GroupPermission.is_admin)) &&
    !!currentUser &&
    groupBs.enabled(GroupPermission.relocate) &&
    display.orCapability &&
    display.orCapability.enabled(NavigatorCapability.relocate);
  display.showResetThumb =
    display.hasFile &&
    !display.hasFolder &&
    display.hasFailedThumb &&
    display.allUpdatable &&
    display.orCapability &&
    display.orCapability.enabled(NavigatorCapability.update_metadata);

  display.showMore =
    display.showVersionControl ||
    display.showPermissions ||
    display.showActivities ||
    display.showManageShares ||
    display.showCreateArchive ||
    display.showDirectLinkManagement ||
    display.showResetThumb ||
    display.showRelocate;
  return display;
};

const useActionDisplayOpt = (targets: FileResponse[], type?: string, parent?: FileResponse, fmIndex: number = 0) => {
  const opt = useMemo(() => {
    return getActionOpt(targets, Viewers, type, parent, fmIndex);
  }, [targets, type, parent, fmIndex]);

  return opt;
};

export default useActionDisplayOpt;
