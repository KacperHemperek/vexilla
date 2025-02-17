defmodule SchedulerTest do
  require ScheduleType
  require TimeType
  # use Timex.Timex.Duration
  use ExUnit.Case
  doctest Scheduler


  test "handles empty schedule" do
    empty_schedule = %Schedule{
      start: 0,
      end: 0,
      timezone: "UTC",
      timeType: "none",
      startTime: 0,
      endTime: 0,
    } |> Jason.encode!() |> Jason.decode!()

    should_empty = Scheduler.is_schedule_active(empty_schedule, ScheduleType.empty(), Timex.now())

    assert should_empty == true
  end

  test "handles empty time schedules" do

    now = Timex.now()

    before_schedule = %Schedule{
      start: Timex.add(now, Timex.Duration.from_days(1)) |> Timex.to_unix |> Kernel.*(1000),
      end: Timex.add(now, Timex.Duration.from_days(3)) |> Timex.to_unix |> Kernel.*(1000),
      timezone: "UTC",
      timeType: TimeType.none(),
      startTime: 0,
      endTime: 0,
    } |> Jason.encode!() |> Jason.decode!()

    during_schedule = %Schedule{
      start: Timex.add(now, Timex.Duration.from_days(-1)) |> Timex.to_unix |> Kernel.*(1000),
      end: Timex.add(now, Timex.Duration.from_days(1)) |> Timex.to_unix |> Kernel.*(1000),
      timezone: "UTC",
      timeType: TimeType.none(),
      startTime: 0,
      endTime: 0,
    } |> Jason.encode!() |> Jason.decode!()

    after_schedule = %Schedule{
      start: Timex.add(now, Timex.Duration.from_days(-3)) |> Timex.to_unix |> Kernel.*(1000),
      end: Timex.add(now, Timex.Duration.from_days(-1)) |> Timex.to_unix |> Kernel.*(1000),
      timezone: "UTC",
      timeType: TimeType.none(),
      startTime: 0,
      endTime: 0,
    } |> Jason.encode!() |> Jason.decode!()

    should_before = Scheduler.is_schedule_active(before_schedule, ScheduleType.global(), now)
    assert should_before == false

    should_during = Scheduler.is_schedule_active(during_schedule, ScheduleType.global(), now)
    assert should_during == true

    should_after = Scheduler.is_schedule_active(after_schedule, ScheduleType.global(), now)
    assert should_after == false
  end

  test "handles start/end schedules" do

    now = Timex.now()

    before_schedule = %Schedule{
      start: Timex.add(now, Timex.Duration.from_days(1)) |> Timex.to_unix |> Kernel.*(1000),
      end: Timex.add(now, Timex.Duration.from_days(3)) |> Timex.to_unix |> Kernel.*(1000),
      timezone: "UTC",
      timeType: TimeType.start_end(),
      startTime: 0,
      endTime: 0,
    } |> Jason.encode!() |> Jason.decode!()

    during_schedule = %Schedule{
      start: Timex.add(now, Timex.Duration.from_days(-1)) |> Timex.to_unix |> Kernel.*(1000),
      end: Timex.add(now, Timex.Duration.from_days(1)) |> Timex.to_unix |> Kernel.*(1000),
      timezone: "UTC",
      timeType: TimeType.start_end(),
      startTime: 0,
      endTime: 0,
    } |> Jason.encode!() |> Jason.decode!()

    after_schedule = %Schedule{
      start: Timex.add(now, Timex.Duration.from_days(-3)) |> Timex.to_unix |> Kernel.*(1000),
      end: Timex.add(now, Timex.Duration.from_days(-1)) |> Timex.to_unix |> Kernel.*(1000),
      timezone: "UTC",
      timeType: TimeType.start_end(),
      startTime: 0,
      endTime: 0,
    } |> Jason.encode!() |> Jason.decode!()

    should_before = Scheduler.is_schedule_active(before_schedule, ScheduleType.global(), now)
    assert should_before == false

    should_during = Scheduler.is_schedule_active(during_schedule, ScheduleType.global(), now)
    assert should_during == true

    should_after = Scheduler.is_schedule_active(after_schedule, ScheduleType.global(), now)
    assert should_after == false
  end


  test "handles daily schedules" do

    zero_day = Timex.from_unix(0)

    Enum.each(0..23, fn(hour) ->

      mocked_now = Timex.now()
      |> Timex.set(
        hour: hour,
        minute: 0,
        second: 0,
        microsecond: 0
      )

      zero_day_with_mocked_time = Timex.set(zero_day,
        hour: mocked_now.hour(),
        minute: mocked_now.minute(),
        second: mocked_now.second(),
        microsecond: mocked_now.microsecond()
      )

      before_schedule = %Schedule{
        start: mocked_now |> Timex.subtract(Timex.Duration.from_days(2)) |> Timex.to_unix |> Kernel.*(1000),
        end: mocked_now |> Timex.add(Timex.Duration.from_days(2)) |> Timex.to_unix |> Kernel.*(1000),
        timezone: "UTC",
        timeType: TimeType.daily(),
        startTime: zero_day_with_mocked_time |> Timex.add(Timex.Duration.from_hours(1)) |> Timex.to_unix |> Kernel.*(1000),
        endTime: zero_day_with_mocked_time |> Timex.add(Timex.Duration.from_hours(3)) |> Timex.to_unix |> Kernel.*(1000),
      } |> Jason.encode!() |> Jason.decode!()

      during_schedule = %Schedule{
        start: mocked_now |> Timex.subtract(Timex.Duration.from_days(2)) |> Timex.to_unix |> Kernel.*(1000),
        end: mocked_now |> Timex.add(Timex.Duration.from_days(2)) |> Timex.to_unix |> Kernel.*(1000),
        timezone: "UTC",
        timeType: TimeType.daily(),
        startTime: zero_day_with_mocked_time |> Timex.subtract(Timex.Duration.from_hours(1)) |> Timex.to_unix |> Kernel.*(1000),
        endTime: zero_day_with_mocked_time |> Timex.add(Timex.Duration.from_hours(1)) |> Timex.to_unix |> Kernel.*(1000),
      } |> Jason.encode!() |> Jason.decode!()

      after_schedule = %Schedule{
        start: mocked_now |> Timex.subtract(Timex.Duration.from_days(2)) |> Timex.to_unix |> Kernel.*(1000),
        end: mocked_now |> Timex.add(Timex.Duration.from_days(2)) |> Timex.to_unix |> Kernel.*(1000),
        timezone: "UTC",
        timeType: TimeType.daily(),
        startTime: zero_day_with_mocked_time |> Timex.subtract(Timex.Duration.from_hours(3)) |> Timex.to_unix |> Kernel.*(1000),
        endTime: zero_day_with_mocked_time |> Timex.subtract(Timex.Duration.from_hours(1)) |> Timex.to_unix |> Kernel.*(1000),
      } |> Jason.encode!() |> Jason.decode!()

      should_before = Scheduler.is_schedule_active(before_schedule, ScheduleType.global(), mocked_now)

      assert should_before == false, "Hour #{hour}: Should be before schedule for schedule with daily time"

      should_during = Scheduler.is_schedule_active(during_schedule, ScheduleType.global(), mocked_now)

      assert should_during == true, "Hour #{hour}: Should be within schedule for schedule with daily time"

      should_after = Scheduler.is_schedule_active(after_schedule, ScheduleType.global(), mocked_now)

      assert should_after == false, "Hour #{hour}: Should be after schedule for schedule with daily time"
    end)
  end
end
