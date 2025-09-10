from manim import *

class QuadraticFunctionAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("y = x^3 in Cartesian Coordinates")
        self.play(FadeIn(title), run_time=0.6)
        self.wait(0.2)
        self.play(FadeOut(title), run_time=0.4)

        # Section 2: Plot y = x^3
        self.next_section("Plot y = x^3")
        axes = Axes(
            x_range=[-2, 2, 1],
            y_range=[-10, 10, 2],
            x_length=8,
            y_length=4.5,
            tips=True,
        )
        axes.add_coordinates()
        axes_labels = axes.get_axis_labels(MathTex("x"), MathTex("y"))

        graph = axes.plot(lambda x: x**3, x_range=[-2, 2], color=YELLOW)
        label = MathTex("y=x^3").set_color(YELLOW)
        label.move_to(axes.c2p(1.0, 1.0) + UP * 0.2)

        self.play(Create(axes), run_time=0.9)
        self.play(Write(axes_labels), run_time=0.4)
        self.play(Create(graph), run_time=0.9)
        self.play(FadeIn(label, shift=UP * 0.2), run_time=0.3)

        # Quick highlight: move a dot along the curve from left to right
        dot = Dot(color=RED).move_to(axes.c2p(-2, -8))
        self.add(dot)
        self.play(MoveAlongPath(dot, graph), run_time=1.0, rate_func=linear)

        # Clean up before finishing
        self.play(FadeOut(VGroup(axes, axes_labels, graph, label, dot)), run_time=0.6)

        # Section 3: Conclusion
        self.next_section("Conclusion")
        conclusion = Text("Cubic: S-shaped, odd function").scale(0.6)
        self.play(FadeIn(conclusion), run_time=0.3)
        self.wait(0.3)
        self.play(FadeOut(conclusion), run_time=0.3)
