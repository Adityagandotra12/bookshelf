import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../index';
import {
  loginThunk,
  registerThunk,
  logout,
  setUser,
} from '../slices/authSlice';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, loading } = useSelector((state: RootState) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      await dispatch(loginThunk({ email, password })).unwrap();
    },
    [dispatch]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await dispatch(registerThunk({ name, email, password })).unwrap();
    },
    [dispatch]
  );

  const doLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const doSetUser = useCallback(
    (u: RootState['auth']['user']) => {
      dispatch(setUser(u));
    },
    [dispatch]
  );

  return {
    user,
    token,
    loading,
    login,
    register,
    logout: doLogout,
    setUser: doSetUser,
  };
}
