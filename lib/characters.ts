import type {Input} from './schema';
export const characterAges={'30s':'30代','40s':'40代','50s':'50代','60s':'60代'} as const;
export function characterDirection(input:Pick<Input,'characterAge'>):string{
  const age=input.characterAge||'30s',decade=age.slice(0,2);
  return `PRIORITY CHARACTER AGE: Depict the adult protagonist in their ${decade}s. A mother raising a young child should look around ${Number(decade)+2} years old, with natural age-appropriate facial features and styling. Keep the same adult age throughout the set. The audience's age is NOT the character's age. This selected age overrides conflicting age descriptions in an older saved art direction, scene, or reference image. A previous reference may guide palette and clothing, but must not make the protagonist older than the selected age. Do not add grandparents or older adults unless the scene specifically requires them.`;
}
