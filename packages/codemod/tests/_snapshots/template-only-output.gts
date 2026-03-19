import type { TOC } from '@ember/component/template-only';
import IconName from 'my-app/assets/icons/icon-name.svg';
import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';

export interface TempSignature {
  Args: {};
  Element: HTMLDivElement;
  Blocks: {
    default: [];
  };
}

const Temp: TOC<TempSignature> = <template>
  <IconNameInline />
  <IconNameInline class="my-icon" />
  <IconName />
  <IconName class="my-icon" />
</template>

export default Temp;
