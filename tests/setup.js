// Setup mock storage for test environment (handling Node 26 experimental localStorage)
const createMockStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null
  };
};

const mockLocalStorage = createMockStorage();
const mockSessionStorage = createMockStorage();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
    writable: true
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    configurable: true,
    writable: true
  });
}

try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
    writable: true
  });
} catch (e) {}
