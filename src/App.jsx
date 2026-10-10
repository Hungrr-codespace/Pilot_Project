import { LayoutProvider } from '@/context/LayoutProvider';
import { MenuProvider } from '@/context/MenuProvider';
import { OrderProvider } from '@/context/OrderProvider';
import { HomePage } from '@/pages/HomePage';

export default function App() {
  return (
    <LayoutProvider>
      <MenuProvider>
        <OrderProvider>
          <HomePage />
        </OrderProvider>
      </MenuProvider>
    </LayoutProvider>
  );
}
