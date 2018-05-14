import _ from 'lodash';

const QkidsConsole = {};

_.each(['log', 'info', 'error'], func => {
  QkidsConsole[func] = function() {
    if (console && console[func]) {
      const args = Array.prototype.slice.call(arguments);

      console[func].apply(console, args);
    }
  };
});

export default QkidsConsole;
