registerQmlType({
    module: 'QtQuick',
    name: 'SequentialAnimation',
    versions: /.*/,
    constructor: function QMLSequentialAnimation(meta) {
        var QMLAnimation = getConstructor('QtQuick', '2.0', 'Animation');
        QMLAnimation.call(this, meta);
        var curIndex,
            passedLoops,
            i,
            self = this;

        createSimpleProperty("list", this, "animations");
        this.$defaultProperty = "animations";
        this.animations = [];

        function nextAnimation(proceed) {
            var anim;
            if (self.running && !proceed) {
                curIndex++;
                if (curIndex < self.animations.length) {
                    anim = self.animations[curIndex];
                    console.log("nextAnimation", self, curIndex, anim);
                    descr("", anim, ["target"]);
                    anim.start();
                } else {
                    passedLoops++;
                    if (passedLoops >= self.loops) {
                        self.complete();
                    } else {
                        curIndex = -1;
                        nextAnimation();
                    }
                }
            }
        }

        this.animationsChanged.connect(this, function () {
            for (i = 0; i < this.animations.length; i++) {
                if (!this.animations[i].runningChanged.isConnected(nextAnimation))
                    this.animations[i].runningChanged.connect(nextAnimation);
            }
        });

        this.start = function () {
            if (!this.running) {
                this.running = true;
                curIndex = -1;
                passedLoops = 0;
                nextAnimation();
            }
        }
        this.stop = function () {
            if (this.running) {
                this.running = false;
                if (curIndex < this.animations.length) {
                    this.animations[curIndex].stop();
                }
            }
        }

        this.complete = function () {
            if (this.running) {
                if (curIndex < this.animations.length) {
                    this.animations[curIndex].stop();
                }
                this.running = false;
            }
        }

        engine.$registerStart(function () {
            if (self.running) {
                self.running = false;
                self.start();
            }
        });
        engine.$registerStop(function () {
            self.stop();
        });
    }
});
