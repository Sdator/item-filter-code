// Augmentations to the NodeJS type definitions.

declare namespace NodeJS {
  interface Global {
    // tslint:disable-next-line:no-any
    [key: string]: any;
  }
}
