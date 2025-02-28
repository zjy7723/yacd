import { atom } from 'recoil';
import {
  DispatchFn,
  FormattedProxyProvider,
  GetStateFn,
  ProxiesMapping,
  ProxyItem,
  ProxyProvider,
  State,
  StateProxies,
  SwitchProxyCtxItem,
} from 'src/store/types';
import { ClashAPIConfig } from 'src/types';

import * as connAPI from '../api/connections';
import * as proxiesAPI from '../api/proxies';
import { getAutoCloseOldConns, getLatencyTestUrl } from './app';

export const initialState: StateProxies = {
  proxies: {},
  delay: {},
  groupNames: [],
  showModalClosePrevConns: false,
};

const noop = () => null;

// see all types:
// https://github.com/Dreamacro/clash/blob/master/constant/adapters.go

// const ProxyTypeBuiltin = ['DIRECT', 'GLOBAL', 'REJECT'];
// const ProxyGroupTypes = ['Fallback', 'URLTest', 'Selector', 'LoadBalance'];
// const ProxyTypes = ['Shadowsocks', 'Snell', 'Socks5', 'Http', 'Vmess'];

export const NonProxyTypes = [
  'Direct',
  'Reject',
  'Relay',
  'Selector',
  'Fallback',
  'URLTest',
  'LoadBalance',
  'Unknown',
];

export const getProxies = (s: State) => s.proxies.proxies;
export const getDelay = (s: State) => s.proxies.delay;
export const getProxyGroupNames = (s: State) => s.proxies.groupNames;
export const getProxyProviders = (s: State) => s.proxies.proxyProviders || [];
export const getDangleProxyNames = (s: State) => s.proxies.dangleProxyNames;
export const getShowModalClosePrevConns = (s: State) => s.proxies.showModalClosePrevConns;

export function fetchProxies(apiConfig: ClashAPIConfig) {
  return async (dispatch: any, getState: any) => {
    const [proxiesData, providersData] = await Promise.all([
      proxiesAPI.fetchProxies(apiConfig),
      proxiesAPI.fetchProviderProxies(apiConfig),
    ]);

    const { providers: proxyProviders, proxies: providerProxies } = formatProxyProviders(
      providersData.providers
    );
    const proxies = { ...proxiesData.proxies, ...providerProxies };
    const [groupNames, proxyNames] = retrieveGroupNamesFrom(proxies);

    const delayPrev = getDelay(getState());
    const delayNext = { ...delayPrev };

    for (let i = 0; i < proxyNames.length; i++) {
      const name = proxyNames[i];
      const { history } = proxies[name] || { history: [] };
      const h = history[history.length - 1];
      if (h && typeof h.delay === 'number') {
        delayNext[name] = { number: h.delay };
      }
    }

    // proxies that are not from a provider
    // const dangleProxyNames = [];
    // for (const v of proxyNames) {
    //   if (!providerProxies[v]) dangleProxyNames.push(v);
    // }

    dispatch('store/proxies#fetchProxies', (s: State) => {
      s.proxies.proxies = proxies;
      s.proxies.groupNames = groupNames;
      s.proxies.delay = delayNext;
      s.proxies.proxyProviders = proxyProviders;
      // s.proxies.dangleProxyNames = dangleProxyNames;
      // TODO proxies that should not be excluded the provider on delay test
      s.proxies.dangleProxyNames = proxyNames;
    });
  };
}

export function updateProviderByName(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn) => {
    try {
      await proxiesAPI.updateProviderByName(apiConfig, name);
    } catch (x) {
      // ignore
    }
    // should be optimized
    // but ¯\_(ツ)_/¯
    dispatch(fetchProxies(apiConfig));
  };
}

export function updateProviders(apiConfig: ClashAPIConfig, names: string[]) {
  return async (dispatch: DispatchFn) => {
    for (let i = 0; i < names.length; i++) {
      try {
        await proxiesAPI.updateProviderByName(apiConfig, names[i]);
      } catch (x) {
        // ignore
      }
    }
    // should be optimized
    // but ¯\_(ツ)_/¯
    dispatch(fetchProxies(apiConfig));
  };
}

async function healthcheckProviderByNameInternal(apiConfig: ClashAPIConfig, name: string) {
  try {
    await proxiesAPI.healthcheckProviderByName(apiConfig, name);
  } catch (x) {
    // ignore
  }
}

export function healthcheckProviderByName(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn) => {
    await healthcheckProviderByNameInternal(apiConfig, name);
    // should be optimized
    // but ¯\_(ツ)_/¯
    await dispatch(fetchProxies(apiConfig));
  };
}

async function closeGroupConns(
  apiConfig: ClashAPIConfig,
  groupName: string,
  exceptionItemName: string
) {
  const res = await connAPI.fetchConns(apiConfig);
  if (!res.ok) {
    console.log('unable to fetch all connections', res.statusText);
    /* throw new Error(); */
  }
  const json = await res.json();
  const connections = json.connections;
  const idsToClose = [];
  for (const conn of connections) {
    if (
      // include the groupName
      conn.chains.indexOf(groupName) > -1 &&
      // but not include the itemName
      conn.chains.indexOf(exceptionItemName) < 0
    ) {
      idsToClose.push(conn.id);
    }
  }

  await Promise.all(idsToClose.map((id) => connAPI.closeConnById(apiConfig, id).catch(noop)));
}

function resolveChain(proxies: ProxiesMapping, groupName: string, itemName: string) {
  const chain = [itemName, groupName];

  let child: ProxyItem;
  let childKey = itemName;
  while ((child = proxies[childKey]) && child.now) {
    chain.unshift(child.now);
    childKey = child.now;
  }
  return chain;
}

async function switchProxyImpl(
  dispatch: DispatchFn,
  getState: GetStateFn,
  apiConfig: ClashAPIConfig,
  groupName: string,
  itemName: string
) {
  try {
    const res = await proxiesAPI.requestToSwitchProxy(apiConfig, groupName, itemName);
    if (res.ok === false) {
      throw new Error(`failed to switch proxy: res.statusText`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err, 'failed to swith proxy');
    throw err;
  }

  dispatch(fetchProxies(apiConfig));
  const autoCloseOldConns = getAutoCloseOldConns(getState());
  if (autoCloseOldConns) {
    // use fresh state
    const proxies = getProxies(getState());
    // no wait
    closePrevConns(apiConfig, proxies, { groupName, itemName });
  }

  /* dispatch('showModalClosePrevConns', (s: GlobalState) => { */
  /*   s.proxies.showModalClosePrevConns = true; */
  /*   s.proxies.switchProxyCtx = { to: { groupName, itemName } }; */
  /* }); */
}

function closeModalClosePrevConns() {
  return (dispatch: DispatchFn) => {
    dispatch('closeModalClosePrevConns', (s: State) => {
      s.proxies.showModalClosePrevConns = false;
    });
  };
}

function closePrevConns(
  apiConfig: ClashAPIConfig,
  proxies: ProxiesMapping,
  switchTo: SwitchProxyCtxItem
) {
  // we must have fetched the proxies before
  // so the proxies here is fresh
  /* const proxies = s.proxies.proxies; */
  const chain = resolveChain(proxies, switchTo.groupName, switchTo.itemName);
  closeGroupConns(apiConfig, switchTo.groupName, chain[0]);
}

function closePrevConnsAndTheModal(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const s = getState();
    const switchTo = s.proxies.switchProxyCtx?.to;
    if (!switchTo) {
      dispatch(closeModalClosePrevConns());
      return;
    }

    // we must have fetched the proxies before
    // so the proxies here is fresh
    const proxies = s.proxies.proxies;
    closePrevConns(apiConfig, proxies, switchTo);

    dispatch('closePrevConnsAndTheModal', (s: State) => {
      s.proxies.showModalClosePrevConns = false;
      s.proxies.switchProxyCtx = undefined;
    });
  };
}

export function switchProxy(apiConfig: ClashAPIConfig, groupName: string, itemName: string) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    // switch proxy asynchronously
    switchProxyImpl(dispatch, getState, apiConfig, groupName, itemName).catch(noop);

    // optimistic UI update
    dispatch('store/proxies#switchProxy', (s) => {
      const proxies = s.proxies.proxies;
      if (proxies[groupName] && proxies[groupName].now) {
        proxies[groupName].now = itemName;
      }
    });
  };
}

function requestDelayForProxyOnce(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const latencyTestUrl = getLatencyTestUrl(getState());
    const res = await proxiesAPI.requestDelayForProxy(apiConfig, name, latencyTestUrl);
    let error = '';
    if (res.ok === false) {
      error = res.statusText;
    }
    const { delay } = await res.json();

    const delayPrev = getDelay(getState());
    const delayNext = {
      ...delayPrev,
      [name]: {
        error,
        number: delay,
      },
    };

    dispatch('requestDelayForProxyOnce', (s) => {
      s.proxies.delay = delayNext;
    });
  };
}

export function requestDelayForProxy(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn) => {
    await dispatch(requestDelayForProxyOnce(apiConfig, name));
  };
}

export function requestDelayForProxies(apiConfig: ClashAPIConfig, names: string[]) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const proxyNames = getDangleProxyNames(getState());

    const works = names
      // remove names that are provided by proxy providers
      .filter((p) => proxyNames.indexOf(p) > -1)
      .map((p) => dispatch(requestDelayForProxy(apiConfig, p)));
    await Promise.all(works);
    await dispatch(fetchProxies(apiConfig));
  };
}

export function requestDelayAll(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const proxyNames = getDangleProxyNames(getState());
    await Promise.all(proxyNames.map((p) => dispatch(requestDelayForProxy(apiConfig, p))));
    const proxyProviders = getProxyProviders(getState());
    // one by one
    for (const p of proxyProviders) {
      await healthcheckProviderByNameInternal(apiConfig, p.name);
    }
    await dispatch(fetchProxies(apiConfig));
  };
}

function retrieveGroupNamesFrom(proxies: Record<string, ProxyItem>) {
  let groupNames = [];
  let globalAll: string[];
  const proxyNames = [];
  for (const prop in proxies) {
    const p = proxies[prop];
    if (p.all && Array.isArray(p.all)) {
      if (prop === 'GLOBAL') {
        globalAll = Array.from(p.all);
      } else {
        groupNames.push(prop);
      }
    } else if (NonProxyTypes.indexOf(p.type) < 0) {
      proxyNames.push(prop);
    }
  }
  if (globalAll) {
    // Sort groups according to its index in GLOBAL group
    groupNames = groupNames
      .map((name) => [globalAll.indexOf(name), name])
      .sort((a, b) => a[0] - b[0])
      .map((group) => group[1]);

    // Put GLOBAL in the end
    groupNames.push('GLOBAL');
  }
  return [groupNames, proxyNames];
}

type ProvidersRaw = {
  [key: string]: ProxyProvider;
};

function formatProxyProviders(providersInput: ProvidersRaw): {
  providers: Array<FormattedProxyProvider>;
  proxies: { [key: string]: ProxyItem };
} {
  const keys = Object.keys(providersInput);
  const providers = [];
  const proxies = {};
  for (let i = 0; i < keys.length; i++) {
    const provider: ProxyProvider = providersInput[keys[i]];
    if (provider.name === 'default' || provider.vehicleType === 'Compatible') {
      continue;
    }
    const proxiesArr = provider.proxies;
    const names = [];
    for (let j = 0; j < proxiesArr.length; j++) {
      const proxy = proxiesArr[j];
      proxies[proxy.name] = proxy;
      names.push(proxy.name);
    }

    // mutate directly
    provider.proxies = names;
    providers.push(provider);
  }

  return {
    providers,
    proxies,
  };
}

export const actions = {
  requestDelayForProxies,
  closeModalClosePrevConns,
  closePrevConnsAndTheModal,
};

export const proxyFilterText = atom({
  key: 'proxyFilterText',
  default: '',
});
