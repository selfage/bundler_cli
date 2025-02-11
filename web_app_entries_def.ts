import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface WebAppEntry {
  source?: string,
  output?: string,
}

export let WEB_APP_ENTRY: MessageDescriptor<WebAppEntry> = {
  name: 'WebAppEntry',
  fields: [{
    name: 'source',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'output',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }],
};

export interface WebAppEntries {
  entries?: Array<WebAppEntry>,
  extraAssets?: Array<string>,
}

export let WEB_APP_ENTRIES: MessageDescriptor<WebAppEntries> = {
  name: 'WebAppEntries',
  fields: [{
    name: 'entries',
    index: 1,
    messageType: WEB_APP_ENTRY,
    isArray: true,
  }, {
    name: 'extraAssets',
    index: 2,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }],
};
