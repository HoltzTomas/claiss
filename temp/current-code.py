from manim import *

class BooleanAlgebraAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Boolean Algebra", font_size=48)
        subtitle = Text("The Mathematics of Logic", font_size=36)
        VGroup(title, subtitle).arrange(DOWN, buff=0.5)
        self.play(Write(title))
        self.play(FadeIn(subtitle, shift=UP))
        self.wait(1)
        self.play(FadeOut(VGroup(title, subtitle)))

        # Section 2: Basic Operations
        self.next_section("Basic Operations")
        operations = VGroup(
            Text("AND (∧)", color=BLUE),
            Text("OR (∨)", color=GREEN),
            Text("NOT (¬)", color=RED)
        ).arrange(DOWN, buff=1)
        
        self.play(Write(operations[0]))
        self.wait(0.5)
        self.play(Write(operations[1]))
        self.wait(0.5)
        self.play(Write(operations[2]))
        self.wait(1)
        self.play(FadeOut(operations))

        # Section 3: AND Operation
        self.next_section("AND Operation")
        and_title = Text("AND Operation (∧)", color=BLUE)
        and_title.to_edge(UP)
        self.play(Write(and_title))

        truth_table = VGroup(
            Text("A", color=YELLOW),
            Text("B", color=YELLOW),
            Text("A ∧ B", color=BLUE)
        ).arrange(RIGHT, buff=1)
        truth_table.next_to(and_title, DOWN, buff=1)

        values = VGroup(
            VGroup(
                Text("1", color=WHITE),
                Text("1", color=WHITE),
                Text("1", color=BLUE)
            ).arrange(RIGHT, buff=1),
            VGroup(
                Text("1", color=WHITE),
                Text("0", color=WHITE),
                Text("0", color=BLUE)
            ).arrange(RIGHT, buff=1),
            VGroup(
                Text("0", color=WHITE),
                Text("1", color=WHITE),
                Text("0", color=BLUE)
            ).arrange(RIGHT, buff=1),
            VGroup(
                Text("0", color=WHITE),
                Text("0", color=WHITE),
                Text("0", color=BLUE)
            ).arrange(RIGHT, buff=1)
        ).arrange(DOWN, buff=0.5)
        values.next_to(truth_table, DOWN, buff=0.5)

        self.play(Write(truth_table))
        self.wait(1)
        for row in values:
            self.play(Write(row))
            self.wait(0.5)
        self.wait(1)
        self.play(FadeOut(VGroup(and_title, truth_table, values)))

        # Section 4: OR Operation
        self.next_section("OR Operation")
        or_title = Text("OR Operation (∨)", color=GREEN)
        or_title.to_edge(UP)
        self.play(Write(or_title))

        or_table = VGroup(
            Text("A", color=YELLOW),
            Text("B", color=YELLOW),
            Text("A ∨ B", color=GREEN)
        ).arrange(RIGHT, buff=1)
        or_table.next_to(or_title, DOWN, buff=1)

        or_values = VGroup(
            VGroup(
                Text("1", color=WHITE),
                Text("1", color=WHITE),
                Text("1", color=GREEN)
            ).arrange(RIGHT, buff=1),
            VGroup(
                Text("1", color=WHITE),
                Text("0", color=WHITE),
                Text("1", color=GREEN)
            ).arrange(RIGHT, buff=1),
            VGroup(
                Text("0", color=WHITE),
                Text("1", color=WHITE),
                Text("1", color=GREEN)
            ).arrange(RIGHT, buff=1),
            VGroup(
                Text("0", color=WHITE),
                Text("0", color=WHITE),
                Text("0", color=GREEN)
            ).arrange(RIGHT, buff=1)
        ).arrange(DOWN, buff=0.5)
        or_values.next_to(or_table, DOWN, buff=0.5)

        self.play(Write(or_table))
        self.wait(1)
        for row in or_values:
            self.play(Write(row))
            self.wait(0.5)
        self.wait(1)
        self.play(FadeOut(VGroup(or_title, or_table, or_values)))

        # Section 5: NOT Operation
        self.next_section("NOT Operation")
        not_title = Text("NOT Operation (¬)", color=RED)
        not_title.to_edge(UP)
        self.play(Write(not_title))

        not_table = VGroup(
            Text("A", color=YELLOW),
            Text("¬A", color=RED)
        ).arrange(RIGHT, buff=1)
        not_table.next_to(not_title, DOWN, buff=1)

        not_values = VGroup(
            VGroup(
                Text("1", color=WHITE),
                Text("0", color=RED)
            ).arrange(RIGHT, buff=1),
            VGroup(
                Text("0", color=WHITE),
                Text("1", color=RED)
            ).arrange(RIGHT, buff=1)
        ).arrange(DOWN, buff=0.5)
        not_values.next_to(not_table, DOWN, buff=0.5)

        self.play(Write(not_table))
        self.wait(1)
        for row in not_values:
            self.play(Write(row))
            self.wait(0.5)
        self.wait(1)
        self.play(FadeOut(VGroup(not_title, not_table, not_values)))

        # Section 6: Conclusion
        self.next_section("Conclusion")
        conclusion = Text("Boolean Algebra: Foundation of Digital Logic", color=YELLOW)
        self.play(Write(conclusion))
        self.wait(2)
        self.play(FadeOut(conclusion))