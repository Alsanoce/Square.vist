import { Routes, Route } from "react-router-dom";
import "./styles/global.css";

import Navbar               from "./components/Navbar";
import Home                 from "./pages/home";
import Donate               from "./pages/donate";
import Payment              from "./pages/Payment";
import PaymentMethod        from "./pages/PaymentMethod";
import BankTransfer         from "./pages/BankTransfer";
import BankTransferConfirmation from "./pages/BankTransferConfirmation";
import OtpConfirmationPage  from "./pages/OtpConfirmationPage";
import ThankYouReceipt      from "./pages/ThankYouReceipt";
import { About }            from "./pages/ThankYouAndAbout";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />}                />
        <Route path="/donate"    element={<Donate />}             />
        <Route path="/payment"   element={<Payment />}            />
        <Route path="/payment/bank" element={<BankTransfer />}    />
        <Route path="/payment/bank/confirmation" element={<BankTransferConfirmation />} />
        <Route path="/payment/:method" element={<PaymentMethod />} />
        <Route path="/confirm"   element={<OtpConfirmationPage />} />
        <Route path="/thank-you" element={<ThankYouReceipt />}    />
        <Route path="/about"     element={<About />}              />
      </Routes>
    </>
  );
}

export default App;
