from manim import *
import numpy as np

class ExponentialFunctionAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = VGroup(
            Text("Exponential Function", weight=BOLD),
            Text("Visualizing y = e^x", slant=ITALIC, font_size=36).set_opacity(0.8)
        ).arrange(DOWN, buff=0.3)
        self.play(FadeIn(title, lag_ratio=0.2))
        self.wait(1.2)
        self.play(FadeOut(title))

        # Section 2: Plot y = e^x
        self.next_section("Plot y = e^x")
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-0.5, 20, 5],
            x_length=10,
            y_length=6,
            axis_config={"include_tip": True, "tip_length": 0.2},
        ).to_edge(DOWN)
        axis_labels = axes.get_axis_labels(x_label=MathTex("x"), y_label=MathTex("y"))

        # Function curve set to RED
        exp_graph = axes.plot(lambda x: np.exp(x), x_range=[-3, 3], color=RED)
        exp_label = axes.get_graph_label(exp_graph, MathTex("e^x"), x_val=2.2, direction=UR)

        # Key points
        dots = VGroup(
            Dot(axes.c2p(-2, np.exp(-2)), color=BLUE),
            Dot(axes.c2p(0, 1), color=BLUE),
            Dot(axes.c2p(1, np.e), color=BLUE),
        )
        dot_labels = VGroup(
            MathTex(r"(-2, e^{-2})").scale(0.6).next_to(dots[0], DL, buff=0.15),
            MathTex(r"(0, 1)").scale(0.6).next_to(dots[1], UL, buff=0.15),
            MathTex(r"(1, e)").scale(0.6).next_to(dots[2], UR, buff=0.15),
        )

        self.play(Create(axes), FadeIn(axis_labels))
        self.play(Create(exp_graph))
        self.play(Write(exp_label))
        self.play(FadeIn(dots, dot_labels))
        self.wait(1.2)

        # Section 3: Slope equals value (tangent line)
        self.next_section("Derivative equals the function")
        t = ValueTracker(-2.0)

        # Moving point on the curve
        moving_dot = always_redraw(
            lambda: Dot(axes.c2p(t.get_value(), np.exp(t.get_value())), color=RED)
        )

        # Tangent line at x = t using dy/dx = e^x
        # Use ORANGE for contrast with the red function
        def get_tangent_line():
            x0 = t.get_value()
            y0 = np.exp(x0)
            m = y0
            dx = 0.6
            x1, y1 = x0 - dx / 2, y0 - m * dx / 2
            x2, y2 = x0 + dx / 2, y0 + m * dx / 2
            return Line(axes.c2p(x1, y1), axes.c2p(x2, y2), color=ORANGE, stroke_width=6)

        tangent = always_redraw(get_tangent_line)

        eqn_box = VGroup(
            MathTex(r"y = e^x"),
            MathTex(r"\frac{dy}{dx} = e^x"),
            MathTex(r"\Rightarrow \text{slope} = y"),
        ).arrange(DOWN, aligned_edge=LEFT).scale(0.7)
        eqn_box.to_corner(UR).shift(LEFT * 0.3 + DOWN * 0.2)

        self.play(FadeIn(moving_dot), FadeIn(tangent), FadeIn(eqn_box, shift=UP))
        self.play(t.animate.set_value(2.5), run_time=6, rate_func=linear)
        self.wait(0.8)

        # Clean up before next topic
        self.play(
            FadeOut(VGroup(dots, dot_labels, moving_dot, tangent, eqn_box)),
            FadeOut(VGroup(exp_graph, exp_label)),
            FadeOut(VGroup(axes, axis_labels)),
        )

        # Section 4: Growth vs Decay (different bases)
        self.next_section("Growth vs Decay")
        self.clear()

        axes2 = Axes(
            x_range=[-3, 3, 1],
            y_range=[0, 4, 1],
            x_length=10,
            y_length=6,
            axis_config={"include_tip": True, "tip_length": 0.2},
        ).to_edge(DOWN)
        axis_labels2 = axes2.get_axis_labels(x_label=MathTex("x"), y_label=MathTex("y"))

        growth_graph = axes2.plot(lambda x: 2 ** x, x_range=[-3, 3], color=GREEN)
        decay_graph = axes2.plot(lambda x: (0.5) ** x, x_range=[-3, 3], color=MAROON)
        growth_label = axes2.get_graph_label(growth_graph, MathTex("2^x"), x_val=2.2, direction=UR)
        decay_label = axes2.get_graph_label(decay_graph, MathTex(r"\left(\tfrac{1}{2}\right)^x"), x_val=-2.2, direction=DL)

        y1_line = axes2.get_horizontal_line(axes2.c2p(0, 1), color=GRAY, line_func=DashedLine)
        intercept_dot = Dot(axes2.c2p(0, 1), color=YELLOW)
        intercept_label = MathTex("b^0 = 1").scale(0.7).next_to(intercept_dot, UL, buff=0.15)

        self.play(Create(axes2), FadeIn(axis_labels2))
        self.play(Create(growth_graph), Create(decay_graph))
        self.play(Write(growth_label), Write(decay_label))
        self.play(Create(y1_line), FadeIn(intercept_dot), Write(intercept_label))
        self.wait(1.6)

        # Clean up
        self.play(
            FadeOut(VGroup(
                axes2, axis_labels2, growth_graph, decay_graph,
                growth_label, decay_label, y1_line, intercept_dot, intercept_label
            ))
        )

        # Section 5: Conclusion
        self.next_section("Conclusion")
        conclusion = VGroup(
            Text("Exponential Functions", weight=BOLD, color=GREEN),
            Text("Rapid growth/decay • For y = e^x, derivative equals itself", font_size=36),
        ).arrange(DOWN, buff=0.3)
        self.play(FadeIn(conclusion, shift=UP))
        self.wait(2)
        self.play(FadeOut(conclusion))
