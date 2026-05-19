import { proxy } from "valtio";

export const layoutStore = proxy({
    isSidebarOpen: false,
});