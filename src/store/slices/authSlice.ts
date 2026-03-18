import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User } from '../../types';
import { authApi } from '../../api/client';

const TOKEN_KEY = 'bookshelf_token';
const USER_KEY = 'bookshelf_user';

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { user, token } = await authApi.login({ email, password });
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user, token };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Login failed');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    {
      name,
      email,
      password,
    }: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { user, token } = await authApi.register({ name, email, password });
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user, token };
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Register failed'
      );
    }
  }
);

export const loadUserThunk = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return rejectWithValue('No token');
    }
    try {
      const { user } = await authApi.me();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user };
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return rejectWithValue('Invalid or expired token');
    }
  }
);

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      state.user = null;
      state.token = null;
      state.loading = false;
    },
    setLoadingFalse: (state) => {
      state.loading = false;
    },
    setUser: (state, action: { payload: User | null }) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
      })
      .addCase(loginThunk.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.loading = false;
      })
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
      })
      .addCase(registerThunk.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.loading = false;
      })
      .addCase(loadUserThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.loading = false;
      })
      .addCase(loadUserThunk.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.loading = false;
      });
  },
});

export const { logout, setUser, setLoadingFalse } = authSlice.actions;
export default authSlice.reducer;
