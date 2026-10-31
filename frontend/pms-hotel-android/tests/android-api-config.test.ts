const original = { ...process.env };
afterEach(() => { process.env = { ...original }; jest.resetModules(); });
function configured(url: string, localHttp = false) {
  process.env.EXPO_PUBLIC_API_BASE_URL = url;
  process.env.EXPO_PUBLIC_USE_MOCK_API = 'false';
  process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP = String(localHttp);
  let config!: typeof import('@/config/environment');
  jest.isolateModules(() => { config = jest.requireActual('@/config/environment'); });
  return config;
}
it('selects real mode explicitly and accepts HTTPS', () => {
  const config = configured('https://pms.example.test/');
  expect(config.environment.useMockApi).toBe(false);
  expect(config.requireApiBaseUrl()).toBe('https://pms.example.test');
});
it('accepts official production HTTPS domain', () => {
  const config = configured('https://hotelboutique.moonyrain.online');
  expect(config.environment.useMockApi).toBe(false);
  expect(config.requireApiBaseUrl()).toBe('https://hotelboutique.moonyrain.online');
});
it('permits VPS backend HTTP url: http://162.35.114.4', () => {
  expect(configured('http://162.35.114.4').requireApiBaseUrl()).toBe('http://162.35.114.4');
});
it.each(['http://10.0.2.2:18081', 'http://192.168.1.20:18081', 'http://172.20.0.2:18081'])('permits opt-in controlled dev HTTP: %s', (url) => {
  expect(configured(url, true).requireApiBaseUrl()).toBe(url);
});
it.each(['http://localhost:8080','http://127.0.0.1:8080','http://public.example.test','https://user:password@pms.example.test','https://pms.example.test/api','https://pms.example.test?token=synthetic'])('rejects unsafe or incorrect Backend origins: %s', (url) => {
  expect(() => configured(url, true).requireApiBaseUrl()).toThrow();
});
it('rejects HTTP without explicit local opt-in and missing real URL', () => {
  expect(() => configured('http://192.168.1.20:18081').requireApiBaseUrl()).toThrow();
  expect(() => configured('').requireApiBaseUrl()).toThrow();
});
