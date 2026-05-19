import { create } from 'zustand';
import { GraphicsTier, loadGraphicsTier, saveGraphicsTier } from './device';

type SettingsState = {
  graphicsTier: GraphicsTier;
  setGraphicsTier: (t: GraphicsTier) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  graphicsTier: loadGraphicsTier(),
  setGraphicsTier: (t) => {
    saveGraphicsTier(t);
    set({ graphicsTier: t });
  },
}));
