from manim import *

class ElectricDipoleAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Electric Field Lines", font_size=40)
        self.play(FadeIn(title))
        self.wait(1)
        self.play(FadeOut(title))

        # Section 2: Positive Charge
        self.next_section("Positive Charge")
        # Create positive charge
        positive = Dot(color=RED)
        plus = Text("+", color=RED).next_to(positive, RIGHT, buff=0.1)
        pos_label = Text("Positive Charge", color=RED, font_size=24).next_to(positive, UP*2)
        
        self.play(Create(positive), Write(plus), Write(pos_label))
        
        # Create radial field lines for positive charge
        pos_field_lines = VGroup()
        pos_arrows = VGroup()
        
        for angle in np.linspace(0, 2*PI, 12):
            start = positive.get_center() + 0.3 * np.array([np.cos(angle), np.sin(angle), 0])
            end = start + 2 * np.array([np.cos(angle), np.sin(angle), 0])
            line = Line(start, end, color=RED_A)
            pos_field_lines.add(line)
            
            # Add arrow at middle of each line pointing AWAY from charge
            mid_point = (start + end) / 2
            arrow = Arrow(
                mid_point - 0.3 * np.array([np.cos(angle), np.sin(angle), 0]),
                mid_point + 0.3 * np.array([np.cos(angle), np.sin(angle), 0]),
                buff=0,
                color=YELLOW
            )
            pos_arrows.add(arrow)

        self.play(Create(pos_field_lines), Create(pos_arrows))
        self.wait(2)
        
        # Clear positive charge
        self.play(
            FadeOut(positive), 
            FadeOut(plus), 
            FadeOut(pos_label),
            FadeOut(pos_field_lines),
            FadeOut(pos_arrows)
        )

        # Section 3: Negative Charge
        self.next_section("Negative Charge")
        # Create negative charge
        negative = Dot(color=BLUE)
        minus = Text("-", color=BLUE).next_to(negative, RIGHT, buff=0.1)
        neg_label = Text("Negative Charge", color=BLUE, font_size=24).next_to(negative, UP*2)
        
        self.play(Create(negative), Write(minus), Write(neg_label))
        
        # Create radial field lines for negative charge
        neg_field_lines = VGroup()
        neg_arrows = VGroup()
        
        for angle in np.linspace(0, 2*PI, 12):
            end = negative.get_center() + 0.3 * np.array([np.cos(angle), np.sin(angle), 0])
            start = end + 2 * np.array([np.cos(angle), np.sin(angle), 0])
            line = Line(start, end, color=BLUE_A)
            neg_field_lines.add(line)
            
            # Add arrow at middle of each line pointing TOWARD charge
            mid_point = (start + end) / 2
            arrow = Arrow(
                mid_point + 0.3 * np.array([np.cos(angle), np.sin(angle), 0]),
                mid_point - 0.3 * np.array([np.cos(angle), np.sin(angle), 0]),
                buff=0,
                color=YELLOW
            )
            neg_arrows.add(arrow)

        self.play(Create(neg_field_lines), Create(neg_arrows))
        self.wait(2)
        
        # Clear negative charge
        self.play(
            FadeOut(negative), 
            FadeOut(minus), 
            FadeOut(neg_label),
            FadeOut(neg_field_lines),
            FadeOut(neg_arrows)
        )

        # Section 4: Dipole
        self.next_section("Dipole")
        # Create dipole charges
        positive = Dot(color=RED).shift(UP)
        negative = Dot(color=BLUE).shift(DOWN)
        plus = Text("+", color=RED).next_to(positive, RIGHT, buff=0.1)
        minus = Text("-", color=BLUE).next_to(negative, RIGHT, buff=0.1)
        dipole = VGroup(positive, negative, plus, minus)
        
        dipole_label = Text("Electric Dipole", font_size=24).to_edge(UP)
        
        self.play(
            Create(dipole),
            Write(dipole_label)
        )

        # Create field lines for dipole
        field_lines = VGroup()
        arrows = VGroup()
        
        # Curved field lines from positive to negative
        for theta in np.linspace(-PI/2, PI/2, 8):
            start = positive.get_center() + 0.3 * np.array([np.cos(theta), np.sin(theta), 0])
            end = negative.get_center() + 0.3 * np.array([np.cos(-theta), np.sin(-theta), 0])
            
            control1 = start + UP * 0.5
            control2 = end + DOWN * 0.5
            
            curve = CubicBezier(
                start,
                control1,
                control2,
                end
            )
            field_lines.add(curve)

            # Add arrow in middle of curve
            mid_point = curve.point_from_proportion(0.5)
            direction = (control2 - control1) / np.linalg.norm(control2 - control1)
            arrow = Arrow(
                mid_point - 0.3 * direction,
                mid_point + 0.3 * direction,
                buff=0,
                color=YELLOW
            )
            arrows.add(arrow)

        # Outer field lines
        for theta in [-PI/4, PI/4]:
            # Upper lines (from positive charge)
            start = positive.get_center() + 0.3 * np.array([np.cos(theta), np.sin(theta), 0])
            end = start + 2 * np.array([np.cos(theta), np.sin(theta), 0])
            
            curve = CubicBezier(
                start,
                start + UP * 0.5,
                end - UP * 0.5,
                end
            )
            field_lines.add(curve)
            
            # Add arrow pointing away from positive charge
            mid_point = curve.point_from_proportion(0.5)
            direction = np.array([np.cos(theta), np.sin(theta), 0])
            arrow = Arrow(
                mid_point - 0.3 * direction,
                mid_point + 0.3 * direction,
                buff=0,
                color=YELLOW
            )
            arrows.add(arrow)
            
            # Lower lines (toward negative charge)
            start = negative.get_center() + 0.3 * np.array([np.cos(-theta), np.sin(-theta), 0])
            end = start + 2 * np.array([np.cos(-theta), np.sin(-theta), 0])
            
            curve = CubicBezier(
                start,
                start - DOWN * 0.5,
                end + DOWN * 0.5,
                end
            )
            field_lines.add(curve)
            
            # Add arrow pointing toward negative charge
            mid_point = curve.point_from_proportion(0.5)
            direction = np.array([np.cos(-theta), np.sin(-theta), 0])
            arrow = Arrow(
                mid_point + 0.3 * direction,
                mid_point - 0.3 * direction,
                buff=0,
                color=YELLOW
            )
            arrows.add(arrow)

        self.play(Create(field_lines))
        self.play(Create(arrows))
        self.wait(2)

        # Section 5: Conclusion
        self.next_section("Conclusion")
        final_text = Text("Electric Field Direction", font_size=40)
        sub_text = Text("Positive → Out\nNegative → In", font_size=30, color=YELLOW).next_to(final_text, DOWN)
        
        self.play(
            FadeOut(field_lines),
            FadeOut(arrows),
            FadeOut(dipole),
            FadeOut(dipole_label),
            FadeIn(final_text),
            FadeIn(sub_text)
        )
        self.wait(2)
        self.play(FadeOut(final_text), FadeOut(sub_text))