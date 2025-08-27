import WalletContextProvider from '@/components/WalletContextProvider';
import { AmmInterface } from '@/components/AmmInterface';

export default function Home() {
  return (
    <WalletContextProvider>
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
        </header>

        <AmmInterface />
      </div>
    </WalletContextProvider>
  );
}
