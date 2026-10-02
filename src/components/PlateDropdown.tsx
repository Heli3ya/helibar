import React from 'react';
import { PlateActionMenu, PlateActionMenuProps } from './PlateActionMenu';

export { PlateActionMenu, type PlateActionMenuProps };
export const PlateDropdown: React.FC<PlateActionMenuProps> = (props) => {
  return <PlateActionMenu {...props} />;
};

export default PlateDropdown;
