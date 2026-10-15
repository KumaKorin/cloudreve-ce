import { FileResponse, NavigatorCapability } from "../api/explorer.ts";
import CrUri from "./uri.ts";
import Boolset from "./boolset.ts";

// canCopyMoveTo checks if the files can be copied or moved to the destination.
export function canCopyMoveTo(files: FileResponse[], dst: string, isCopy: boolean): boolean {
  const dstUri = new CrUri(dst);
  let bsKey = NavigatorCapability.move_to_my;
  const fs = dstUri.fs();
  if (isCopy) {
    switch (fs) {
      case "trash":
        bsKey = NavigatorCapability.copy_to_trash;
        break;
      case "share":
        bsKey = NavigatorCapability.copy_to_share;
        break;
      case "my":
        bsKey = NavigatorCapability.copy_to_my;
        break;
      default:
        return false;
    }
  } else {
    switch (fs) {
      case "trash":
        bsKey = NavigatorCapability.move_to_trash;
        break;
      case "share":
        bsKey = NavigatorCapability.move_to_share;
        break;
      case "my":
        bsKey = NavigatorCapability.move_to_my;
        break;
      default:
        return false;
    }
  }
  const canNotMove = files.some((file) => {
    if (!file.capability) return false;
    const capability = new Boolset(file.capability);
    if (capability.enabled(bsKey)) {
      return false;
    }
    return !capability.enabled(NavigatorCapability.delete_file);
  });
  return !canNotMove;
}
