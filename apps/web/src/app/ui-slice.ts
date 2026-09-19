import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  apiBaseUrlOverride: string;
  showSetupChecklist: boolean;
}

const initialState: UiState = {
  apiBaseUrlOverride: '',
  showSetupChecklist: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setApiBaseUrlOverride: (state, action: PayloadAction<string>) => {
      state.apiBaseUrlOverride = action.payload;
    },
    toggleSetupChecklist: (state) => {
      state.showSetupChecklist = !state.showSetupChecklist;
    },
  },
});

export const { setApiBaseUrlOverride, toggleSetupChecklist } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
