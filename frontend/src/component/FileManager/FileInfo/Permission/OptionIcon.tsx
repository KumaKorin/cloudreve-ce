import { builtinCollectionID, Option } from "./AudienceSearch.tsx";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarProps, useTheme } from "@mui/material";
import Earth from "../../../Icons/Earth.tsx";
import PeopleStar from "../../../Icons/PeopleStar.tsx";
import InPrivate from "../../../Icons/InPrivate.tsx";
import People from "../../../Icons/People.tsx";
import { grey } from "@mui/material/colors";
import UserAvatar from "../../../Common/User/UserAvatar.tsx";

export interface OptionIconProps extends AvatarProps {
  option: Option;
}

export const builtinGroup = "application:modals.builtinCollections";
export const usersGroup = "application:modals.users";
export const groupsGroup = "application:modals.groups";

const OptionIcon = ({ option, ...rest }: OptionIconProps) => {
  const theme = useTheme();
  const { t } = useTranslation();

  if (option.group == usersGroup) {
    return <UserAvatar user={option.user} {...rest} />;
  }

  if (option.group == groupsGroup) {
    return (
      <Avatar {...rest} sx={{ bgcolor: (theme) => theme.palette.primary.light }}>
        <People />
      </Avatar>
    );
  }

  if (option.group == builtinGroup) {
    let color = theme.palette.primary.light;
    let icon = <></>;
    switch (option.id) {
      case builtinCollectionID.everyone:
        color = theme.palette.info.light;
        icon = <Earth />;
        break;
      case builtinCollectionID.same_group:
        color = theme.palette.success.light;
        icon = <PeopleStar />;
        break;
      case builtinCollectionID.other_group:
        color = theme.palette.warning.light;
        icon = <People />;
        break;
      case builtinCollectionID.anonymous:
        color = grey[500];
        icon = <InPrivate />;
        break;
    }

    return (
      <Avatar {...rest} sx={{ bgcolor: color }}>
        {icon}
      </Avatar>
    );
  }

  return null;
};

export default OptionIcon;
