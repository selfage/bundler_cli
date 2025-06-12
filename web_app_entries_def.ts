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

export interface ExtraAsset {
  from?: string,
  to?: string,
}

export let EXTRA_ASSET: MessageDescriptor<ExtraAsset> = {
  name: 'ExtraAsset',
  fields: [{
    name: 'from',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'to',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }],
};

export interface WebAppEntries {
  entries?: Array<WebAppEntry>,
  extraAssets?: Array<ExtraAsset>,
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
    messageType: EXTRA_ASSET,
    isArray: true,
  }],
};
