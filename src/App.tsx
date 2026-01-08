import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import {
  Authenticator,
  ThemeProvider,
  useTheme,
  View,
  Text,
  Heading,
  Button
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsconfig from './amplifyconfiguration.json';

import FuzzyPage from './pages/FuzzyPage';
import GoogleLensPage from './pages/GoogleLensPage';
import logo from './assets/img/logo-data-new.png';
import './App.css';

// Configurar Amplify
Amplify.configure(awsconfig);

// Tema personalizado DataBunker
const theme = {
  name: 'DataBunker Theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '#062341',
          80: '#073C5C',
          90: '#30A7B5',
          100: '#F68D2E',
        },
      },
    },
    components: {
      authenticator: {
        router: {
          boxShadow: '0 8px 24px rgba(6, 35, 65, 0.12)',
          borderWidth: '0',
          borderRadius: '16px',
        },
        form: {
          padding: '20px 40px 40px 40px',
        },
      },
      button: {
        primary: {
          backgroundColor: '#062341',
          _hover: { backgroundColor: '#073C5C' },
          _focus: { backgroundColor: '#073C5C' },
          _active: { backgroundColor: '#062341' },
        },
        link: {
          color: '#30A7B5',
          _hover: { color: '#073C5C' },
        },
      },
      fieldcontrol: {
        borderColor: '#e2e8f0',
        _focus: {
          borderColor: '#30A7B5',
          boxShadow: '0 0 0 3px rgba(48, 167, 181, 0.1)',
        },
      },
      tabs: {
        item: {
          color: '#718096',
          borderColor: 'transparent',
          _active: { borderColor: '#30A7B5', color: '#062341' },
          _hover: { color: '#062341' },
        },
      },
    },
  },
};

// Componentes personalizados del Authenticator
const components = {
  Header() {
    const { tokens } = useTheme();

    return (
      <View textAlign="center" padding={tokens.space.large}>
        <img
          src={logo}
          alt="Logo"
          className="login-logo"
          style={{ maxWidth: '200px', height: 'auto' }}
        />
      </View>
    );
  },

  Footer() {
    const { tokens } = useTheme();

    return (
      <View textAlign="center" padding={tokens.space.large}>
        <Text color={tokens.colors.neutral[80]}>
          &copy; All Rights Reserved
        </Text>
      </View>
    );
  },

  SignIn: {
    Header() {
      const { tokens } = useTheme();
      return (
        <Heading
          padding={`${tokens.space.xl} 0 0 ${tokens.space.xl}`}
          level={3}
        >
        </Heading>
      );
    },
    Footer() {
      const [showMessage, setShowMessage] = useState(false);
      const handleClick = () => {
        setShowMessage(!showMessage);
      };
      return (
        <View textAlign="center">
          <Button
            fontWeight="normal"
            onClick={handleClick}
            size="small"
            variation="link"
          >
            Forgot your Password?
          </Button>
          {showMessage && <p style={{ fontSize: '13px', color: '#718096', marginTop: '8px' }}>Contact the DataBunker administrator</p>}
        </View>
      );
    },
  },

  ForgotPassword: {
    Header() {
      return <Heading>Reset Password</Heading>;
    },
    Footer() {
      return <Text></Text>;
    },
  },
};

// Configuración de campos del formulario
const formFields = {
  signIn: {
    username: {
      placeholder: 'Enter your User',
      label: 'Username',
    },
    password: {
      placeholder: 'Enter your Password',
      label: 'Password',
    }
  },
  forgotPassword: {
    username: {
      placeholder: 'Enter your User',
      label: 'Username',
    },
  },
};

// Componente de la aplicación principal (después del login)
interface MainAppProps {
  username: string;
  signOut: () => void;
}

function MainApp({ username, signOut }: MainAppProps) {
  return (
    <Router>
      <div className="app-container">
        <nav className="nav-tabs">
          <div className="nav-left">
            <NavLink
              to="/fuzzy"
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              Fuzzy Matching
            </NavLink>
            <NavLink
              to="/google-lens"
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              Google Lens
            </NavLink>
          </div>
          <div className="nav-right">
            <span className="user-info">
              <span className="user-icon">👤</span>
              <span className="user-name">{username || 'Usuario'}</span>
            </span>
            <button className="signout-button" onClick={signOut}>
              Cerrar Sesion
            </button>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<FuzzyPage />} />
            <Route path="/fuzzy" element={<FuzzyPage />} />
            <Route path="/google-lens" element={<GoogleLensPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Componente principal con Authenticator
function App() {
  return (
    <ThemeProvider theme={theme}>
      <View className="authenticator-container">
        <Authenticator
          hideSignUp={true}
          formFields={formFields}
          components={components}
        >
          {({ signOut, user }) => (
            <MainApp
              username={user?.username || ''}
              signOut={signOut || (() => {})}
            />
          )}
        </Authenticator>
      </View>
    </ThemeProvider>
  );
}

export default App;
