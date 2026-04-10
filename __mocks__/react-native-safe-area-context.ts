const insets = { top: 0, right: 0, bottom: 0, left: 0 };
const frame = { x: 0, y: 0, width: 320, height: 640 };

export const useSafeAreaInsets = () => insets;
export const useSafeAreaFrame = () => frame;
export const SafeAreaProvider = ({ children }: { children: React.ReactNode }) => children;
export const SafeAreaView = ({ children }: { children: React.ReactNode }) => children;
export const initialWindowMetrics = { insets, frame };
