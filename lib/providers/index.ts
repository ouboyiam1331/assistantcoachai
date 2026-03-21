import { cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { cfbdProvider } from "@/lib/providers/cfbdProvider";
import { mockProvider } from "@/lib/providers/mockProvider";
import type { DataProvider } from "@/lib/providers/types";

export function getDataProvider(): DataProvider {
  return cfbdMockModeEnabled() ? mockProvider : cfbdProvider;
}

