
from manim import *

class ElectricFieldAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Visualizing Electric Fields")
        self.play(Write(title))
        self.wait(1)
        self.play(FadeOut(title))

        # Section 2: Positive Charge
        self.next_section("Positive Charge")
        
        charge_pos = Dot(color=RED)
        plus = MathTex("+").scale(0.8).move_to(charge_pos.get_center())
        positive_charge_label = Text("Positive Charge (+Q)").next_to(charge_pos, UP)
        
        positive_charge = VGroup(charge_pos, plus)
        
        field_lines_out = VGroup()
        for angle in np.arange(0, TAU, TAU / 8):
            arrow = Arrow(
                charge_pos.get_center(),
                charge_pos.get_center() + 2 * np.array([np.cos(angle), np.sin(angle), 0]),
                buff=0.2,
                color=YELLOW
            )
            field_lines_out.add(arrow)
            
        self.play(Create(positive_charge), Write(positive_charge_label))
        self.play(LaggedStart(*[Create(line) for line in field_lines_out], lag_ratio=0.2))
        self.wait(2)
        
        positive_group = VGroup(positive_charge, positive_charge_label, field_lines_out)
        self.play(FadeOut(positive_group))
        self.wait(1)

        # Section 3: Negative Charge
        self.next_section("Negative Charge")
        
        charge_neg = Dot(color=BLUE)
        minus = MathTex("-").scale(0.8).move_to(charge_neg.get_center())
        negative_charge_label = Text("Negative Charge (-Q)").next_to(charge_neg, UP)

        negative_charge = VGroup(charge_neg, minus)

        field_lines_in = VGroup()
        for angle in np.arange(0, TAU, TAU / 8):
            arrow = Arrow(
                charge_neg.get_center() + 2 * np.array([np.cos(angle), np.sin(angle), 0]),
                charge_neg.get_center(),
                buff=0.2,
                color=YELLOW
            )
            field_lines_in.add(arrow)
        
        self.play(Create(negative_charge), Write(negative_charge_label))
        self.play(LaggedStart(*[Create(line) for line in field_lines_in], lag_ratio=0.2))
        self.wait(2)

        negative_group = VGroup(negative_charge, negative_charge_label, field_lines_in)
        self.play(FadeOut(negative_group))
        self.wait(1)

        # Section 4: Electric Dipole
        self.next_section("Electric Dipole")
        dipole_title = Text("Electric Dipole").to_edge(UP)

        charge1_pos = np.array([-2, 0, 0])
        charge2_pos = np.array([2, 0, 0])
        
        charge1 = Dot(charge1_pos, color=RED)
        plus1 = MathTex("+").move_to(charge1.get_center())
        charge1_group = VGroup(charge1, plus1)

        charge2 = Dot(charge2_pos, color=BLUE)
        minus2 = MathTex("-").move_to(charge2.get_center())
        charge2_group = VGroup(charge2, minus2)
        
        def electric_field_func(p):
            r1 = p - charge1_pos
            r2 = p - charge2_pos
            if np.linalg.norm(r1) == 0 or np.linalg.norm(r2) == 0:
                return np.array([0,0,0])
            return (r1 / np.linalg.norm(r1)**3) - (r2 / np.linalg.norm(r2)**3)

        stream_lines = StreamLines(
            electric_field_func,
            x_range=[-5, 5],
            y_range=[-4, 4],
            stroke_width=2,
            color=YELLOW,
        )
        
        self.play(Write(dipole_title))
        self.play(Create(charge1_group), Create(charge2_group))
        
        self.add(stream_lines)
        stream_lines.start_animation(flow_speed=1.5, time_width=0.5)
        self.wait(3)
        
        self.play(FadeOut(stream_lines), FadeOut(charge1_group), FadeOut(charge2_group), FadeOut(dipole_title))
        self.wait(1)

        # Section 5: Conclusion
        self.next_section("Conclusion")
        conclusion_text = Text("Field lines map the invisible forces that shape our universe.").scale(0.7)
        self.play(Write(conclusion_text))
        self.wait(3)
        self.play(FadeOut(conclusion_text))
