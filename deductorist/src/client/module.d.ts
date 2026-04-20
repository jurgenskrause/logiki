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
  __pendingSyncTimer?: ReturnType<typeof setTimeout> | number;
}

declare const DEV_BUILD: boolean;
