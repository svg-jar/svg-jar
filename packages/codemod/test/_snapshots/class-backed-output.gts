import Component from '@glimmer/component';
import IconName from 'my-app/assets/icons/icon-name.svg';
import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';

export interface ClassNameSignature {
  Args: {};
  Element: HTMLDivElement;
  Blocks: {
    default: [];
  };
}

export default class ClassName extends Component<ClassNameSignature> {
  @service declare something: any;

  <template>
    <IconNameInline />
    <IconNameInline class="my-icon" />
    <IconName />
    <IconName class="my-icon" />
  </template>
}
