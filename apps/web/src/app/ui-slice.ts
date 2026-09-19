import { createSlice } from '@reduxjs/toolkit';

interface UiState {
  showSetupChecklist: boolean;
}

const initialState: UiState = {
  showSetupChecklist: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSetupChecklist: (state) => {
      state.showSetupChecklist = !state.showSetupChecklist;
    },
  },
});

export const { toggleSetupChecklist } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
