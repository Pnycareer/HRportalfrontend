import Login from "@/pages/auth/Login";
import Register from "../../pages/auth/Register";


const authRoutes = [
  { index: true, element: <Login /> },
  { path: "/register", element: <Register /> },

  {
    // element: <PrivateRoute />, 
    children: [],
  },
];

export default authRoutes;
  