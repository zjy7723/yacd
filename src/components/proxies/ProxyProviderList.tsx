import * as React from 'react';
import { FormattedProxyProvider } from 'src/store/types';

import ContentHeader from '../ContentHeader';
import { ProxyProvider } from './ProxyProvider';

type Props = {
  items: FormattedProxyProvider[];
};

export function ProxyProviderList({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <>
      <ContentHeader title="Proxy Provider" />
      <div>
        {items.map((item) => (
          <ProxyProvider
            key={item.name}
            name={item.name}
            proxies={item.proxies}
            type={item.type}
            vehicleType={item.vehicleType}
            updatedAt={item.updatedAt}
          />
        ))}
      </div>
    </>
  );
}
