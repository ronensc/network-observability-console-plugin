import { Fields, Labels } from '../api/ipfix';

type Field = keyof Fields | keyof Labels;
export type FieldMapping = (values: FilterValue[]) => { key: Field; values: string[] }[];
type FieldMatching = {
  always?: FieldMapping;
  ifSrc?: FieldMapping;
  ifDst?: FieldMapping;
};

export enum FilterComponent {
  Autocomplete,
  Text
}

export enum FilterCategory {
  Source,
  Destination,
  Common,
  None
}

export type FilterId =
  | 'namespace'
  | 'src_namespace'
  | 'dst_namespace'
  | 'name'
  | 'src_name'
  | 'dst_name'
  | 'kind'
  | 'src_kind'
  | 'dst_kind'
  | 'owner_name'
  | 'src_owner_name'
  | 'dst_owner_name'
  | 'resource'
  | 'src_resource'
  | 'dst_resource'
  | 'address'
  | 'src_address'
  | 'dst_address'
  | 'mac'
  | 'src_mac'
  | 'dst_mac'
  | 'port'
  | 'src_port'
  | 'dst_port'
  | 'host_address'
  | 'src_host_address'
  | 'dst_host_address'
  | 'host_name'
  | 'src_host_name'
  | 'dst_host_name'
  | 'protocol';

export interface FilterDefinition {
  id: FilterId;
  name: string;
  component: FilterComponent;
  category: FilterCategory;
  getOptions: (value: string) => Promise<FilterOption[]>;
  validate: (value: string) => { val?: string; err?: string };
  checkCompletion?: (value: string, selected: string) => { completed: boolean; option: FilterOption };
  autoCompleteAddsQuotes?: boolean;
  hint?: string;
  examples?: string;
  placeholder?: string;
  fieldMatching: FieldMatching;
}

export interface FilterValue {
  v: string;
  display?: string;
}

export interface Filter {
  def: FilterDefinition;
  values: FilterValue[];
}

export interface FilterOption {
  name: string;
  value: string;
}

export const createFilterValue = (def: FilterDefinition, value: string): Promise<FilterValue> => {
  return def.getOptions(value).then(opts => {
    const option = opts.find(opt => opt.name === value || opt.value === value);
    return option ? { v: option.value, display: option.name } : { v: value };
  });
};
