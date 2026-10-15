import { Autocomplete, Box, createFilterOptions, debounce } from "@mui/material";
import { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAllGroups, getSearchUser } from "../../../../api/api.ts";
import { Group, User } from "../../../../api/user.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { FilledTextField, NoWrapBox, NoWrapTypography } from "../../../Common/StyledComponents.tsx";
import OptionIcon from "./OptionIcon.tsx";

export interface AudienceSearchProps {
  onOptionAdded: (o: Option) => void;
}

export interface Option {
  priority?: number;
  name: string;
  description?: string;
  group: string;
  id?: string;
  user?: User;
}

export const builtinCollectionID = {
  everyone: "everyone",
  same_group: "same_group",
  other_group: "other_group",
  anonymous: "anonymous",
};

export const UserPriority = 200;
export const GroupPriority = 150;

const builtinGroup = "application:modals.builtinCollections";
export const buitinSameGroupOption = (t: TFunction): Option => ({
  priority: 100,
  name: t("application:modals.sameGroup"),
  group: builtinGroup,
  id: builtinCollectionID.same_group,
});

export const builtinOtherGroupOption = (t: TFunction): Option => ({
  priority: 100,
  name: t("application:modals.otherGroup"),
  group: builtinGroup,
  id: builtinCollectionID.other_group,
});

let groups: Group[] = [];

const AudienceSearch = (props: AudienceSearchProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState<Option | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<readonly Option[]>([]);
  const [groupOptions, setGroupOptions] = useState<readonly Group[]>(groups);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const dispatch = useAppDispatch();

  const defaultBuiltin = useMemo((): Option[] => {
    return [
      buitinSameGroupOption(t),
      builtinOtherGroupOption(t),
      ...groupOptions.map((group) => ({
        priority: GroupPriority,
        name: group.name,
        group: "application:modals.groups",
        id: group.id,
      })),
    ];
  }, [t, groupOptions]);

  useEffect(() => {
    if (groups.length > 0) {
      return;
    }

    setOptionsLoading(true);
    dispatch(getAllGroups())
      .then((results) => {
        groups = results;
        setGroupOptions(results);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
  }, []);

  useEffect(() => {
    setOptions(defaultBuiltin);
  }, [defaultBuiltin]);

  const fetch = useMemo(
    () =>
      debounce((request: { input: string }, callback: (results?: readonly User[]) => void) => {
        setOptionsLoading(true);
        dispatch(getSearchUser(request.input))
          .then((results) => {
            callback(results);
          })
          .finally(() => {
            setOptionsLoading(false);
          });
      }, 400),
    [dispatch, setOptionsLoading],
  );

  useEffect(() => {
    let active = true;

    if (inputValue === "" || inputValue.length < 2) {
      setOptions(defaultBuiltin);
      return undefined;
    }

    fetch({ input: inputValue }, (results?: readonly User[]) => {
      if (active) {
        let newOptions: readonly Option[] = [];

        if (results) {
          newOptions = [
            ...defaultBuiltin,
            ...results.map((user) => ({
              priority: UserPriority,
              name: user.nickname,
              description: user.email ?? user.id,
              group: "application:modals.users",
              id: user.id,
              user: user,
            })),
          ];
        }

        setOptions(newOptions);
      }
    });
    return () => {
      active = false;
    };
  }, [value, inputValue, fetch]);

  const filterOptions = useMemo(() => {
    return createFilterOptions<Option>({
      stringify: (option) => option.name + " " + option.description,
    });
  }, []);

  return (
    <Autocomplete
      value={value}
      filterOptions={filterOptions}
      options={options}
      blurOnSelect
      onChange={(_event: any, newValue: Option | null) => {
        newValue && props.onOptionAdded(newValue);
      }}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      groupBy={(option) => t(option.group)}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
      noOptionsText={t("application:modals.noResults")}
      renderOption={(props, option) => {
        return (
          <li {...props}>
            <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
              <Box>
                <OptionIcon option={option} />
              </Box>
              <NoWrapBox
                sx={{
                  width: "100%",
                  ml: 2,
                }}
              >
                {option.name}
                {option.description && (
                  <NoWrapTypography
                    sx={{
                      width: "100%",
                    }}
                    variant="body2"
                    color="text.secondary"
                  >
                    {option.description}
                  </NoWrapTypography>
                )}
              </NoWrapBox>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => (
        <FilledTextField
          {...params}
          variant="filled"
          margin="dense"
          label={t("application:modals.searchGroupUser")}
          type="text"
          fullWidth
        />
      )}
    />
  );
};

export default AudienceSearch;
