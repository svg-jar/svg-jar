import Component from '@glimmer/component';
import SomeOtherIcon from 'my-app/assets/icons/some-other-icon.svg?unsafe-inline';
import SpriteIcon from 'my-app/assets/icons/sprite-icon.svg';
import Two from 'my-app/assets/icons/two.svg?unsafe-inline';
import OneIcon from 'my-app/assets/icons/one-icon.svg?unsafe-inline';

export default class ClassName extends Component {
  <template>
    <OneIcon />
    <div>
      <Two class="my-icon" />
    </div>
    <SpriteIcon class="my-icon" title="My Icon" />
    {{someHelper "not-an-icon-name"}}
    <SomeOtherIcon class={{classHelper "icon-class" "another-class"}} />
  </template>
}
