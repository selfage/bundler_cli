import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export interface WebAppEntry {
/* The source TypeScript file, relative to the directory of the config file. File ext can be neglected. */
  ts?: string,
/* The output file name after bundling, relative to the directory of the config file. File ext can be neglectd. A JS file and an HTML file are expected to be generated. */
  bin?: string,
}

export let WEB_APP_ENTRY: MessageDescriptor<WebAppEntry> = {
  name: 'WebAppEntry',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'ts',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'bin',
      primitiveType: PrimitiveType.STRING,
    },
  ]
};

export interface WebAppEntries {
  rootDir?: string,
  entries?: Array<WebAppEntry>,
/* Extra asset files that need to be copied to and served from a new directory, such as favicon.ico. Asset files that are imported by entry files don't need to be included here. */
  extraAssets?: Array<string>,
}

export let WEB_APP_ENTRIES: MessageDescriptor<WebAppEntries> = {
  name: 'WebAppEntries',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'rootDir',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'entries',
      messageDescriptor: WEB_APP_ENTRY,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
    {
      name: 'extraAssets',
      primitiveType: PrimitiveType.STRING,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ]
};
