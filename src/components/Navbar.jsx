import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between">
      <h1 className="font-bold">💧 سقيا الخير</h1>
      <div className="space-x-4">
        <Link to="/">الرئيسية</Link>
        <Link to="/donate">تبرع</Link>
        <Link to="/about">عن المبادرة</Link>
      </div>
    </nav>
  );
}

export default Navbar;
