import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export interface WebAppEntry {
/* The source TypeScript file, relative to the directory of the config file. File ext can be neglected. */
  source?: string,
/* The output file name after bundling, relative to the directory of the config file. File ext can be neglectd. A JS file and an HTML file are expected to be generated. */
  output?: string,
}

export let WEB_APP_ENTRY: MessageDescriptor<WebAppEntry> = {
  name: 'WebAppEntry',
  fields: [
    {
      name: 'source',
      primitiveType: PrimitiveType.STRING,
      index: 1,
    },
    {
      name: 'output',
      primitiveType: PrimitiveType.STRING,
      index: 2,
    },
  ]
};

export interface WebAppEntries {
  entries?: Array<WebAppEntry>,
/* Extra asset files that need to be copied to and served from a new directory, such as favicon.ico. Asset files that are imported by entry files don't need to be included here. */
  extraAssets?: Array<string>,
}

export let WEB_APP_ENTRIES: MessageDescriptor<WebAppEntries> = {
  name: 'WebAppEntries',
  fields: [
    {
      name: 'entries',
      messageType: WEB_APP_ENTRY,
      isArray: true,
      index: 1,
    },
    {
      name: 'extraAssets',
      primitiveType: PrimitiveType.STRING,
      isArray: true,
      index: 2,
    },
  ]
};
