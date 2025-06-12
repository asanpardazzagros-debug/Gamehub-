import { createSlice } from "@reduxjs/toolkit";

type NetworkSlice = {
  rpcUrls: string[];
  selectedNetwork: number;
  customNetwork: string;
};

const initialState: NetworkSlice = {
  rpcUrls: ["http://localhost:9545", "custom"],
  selectedNetwork: 0,
  customNetwork: "",
};

const networkSlice = createSlice({
  name: "NetworkSlice",
  initialState: initialState,
  reducers: {
    updateCustomNetwork: (state, action: { payload: string }) => {
      state.customNetwork = action.payload;
    },
    updateSelectedNetwork: (state, action: { payload: number }) => {
      state.selectedNetwork = action.payload;
    },
  },
});

export const { updateCustomNetwork, updateSelectedNetwork } =
  networkSlice.actions;
export const networkReducer = networkSlice.reducer;
