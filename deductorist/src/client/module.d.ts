declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

interface Window {
  __isResetting?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __pendingSyncTimer?: any;
}
